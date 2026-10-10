"""
새한신용정보(saehanccm.com) - 호스팅어(Hostinger) SFTP / SSH 자동 동기화 배포 스크립트
호스팅어 보안 SFTP 포트(65002)를 활용하여 정적 칼럼, 사이트맵, 에셋을 빠르고 안전하게 동기화합니다.
CDN/프록시 우회, 다중 호스트 자동 장애복구(Failover), 타임아웃 방지 및 지능형 증분 업로드 메커니즘 탑재.
"""

import os
import sys
import posixpath
import socket
import time

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(ROOT_DIR, '.env')

# 기본 호스팅어 원격 IP 및 설정
HOSTINGER_DIRECT_IP = '145.79.25.99'
HOSTINGER_FTP_HOST = 'saehanccm.com'
KNOWN_CDN_IPS = {'147.93.77.8', '213.210.57.3', '147.93.77.230', '213.210.57.214'}

# 항상 강제 재전송하여 최신 상태를 유지해야 하는 파일 목록
ALWAYS_REFRESH_FILES = {
    'index.html',
    'robots.txt',
    'sitemap.xml',
    'data/posts.json',
    'posts/index.html'
}

# 배포 제외 디렉토리 및 파일
EXCLUDE_DIRS = {'.git', '.github', 'node_modules', 'scripts', '__pycache__', '.idea', '.vscode'}
EXCLUDE_FILES = {'.env', '.env.example', '.gitignore', 'package.json', 'package-lock.json', '.DS_Store', 'Thumbs.db', 'README.md'}

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip("'\"")
    return env

config = load_env(ENV_PATH)

def clean_host(host_str):
    if not host_str:
        return ""
    h = str(host_str).strip()
    for prefix in ('sftp://', 'ftp://', 'ssh://', 'https://', 'http://'):
        if h.startswith(prefix):
            h = h[len(prefix):]
    if ':' in h and h.count(':') == 1 and not h.startswith('['):
        h = h.split(':', 1)[0]
    return h.rstrip('/')

def clean_credential(val):
    if not val:
        return ""
    return str(val).strip().strip("'\"")

def clean_password(val):
    if not val:
        return ""
    return str(val).strip('\r\n')

RAW_SERVER = config.get('FTP_SERVER') or os.environ.get('FTP_SERVER') or HOSTINGER_DIRECT_IP
SERVER = clean_host(RAW_SERVER)
USERNAME = clean_credential(config.get('FTP_USERNAME') or os.environ.get('FTP_USERNAME') or 'u687833262')
PASSWORD = clean_password(config.get('FTP_PASSWORD') or os.environ.get('FTP_PASSWORD'))

raw_port = config.get('FTP_PORT') or os.environ.get('FTP_PORT') or 65002
try:
    PORT = int(clean_host(str(raw_port)))
except ValueError:
    PORT = 65002

raw_dir = config.get('FTP_REMOTE_DIR') or os.environ.get('FTP_REMOTE_DIR') or 'domains/saehanccm.com/public_html'
REMOTE_DIR = clean_host(raw_dir)

def check_credentials():
    if not USERNAME or not PASSWORD:
        print("❌ 서버 접속 계정 또는 비밀번호가 설정되지 않았습니다. .env 또는 GitHub Secrets를 확인해주세요.")
        return False
    return True

created_dirs = set()
remote_dir_cache = {}

def ensure_remote_dir_sftp(sftp, remote_dir):
    """원격 SFTP 디렉토리가 없으면 계층별로 순차 생성 (캐싱 적용)"""
    if remote_dir in created_dirs:
        return
    parts = remote_dir.strip('/').split('/')
    current = "/" if remote_dir.startswith('/') else ""
    for part in parts:
        current = posixpath.join(current, part)
        if current in created_dirs:
            continue
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass
        created_dirs.add(current)

def get_remote_file_sizes(sftp, remote_dir):
    """원격 디렉토리 내 파일 크기 일괄 조회 (라운드트립 최적화)"""
    if remote_dir in remote_dir_cache:
        return remote_dir_cache[remote_dir]
    sizes = {}
    try:
        for attr in sftp.listdir_attr(remote_dir):
            sizes[attr.filename] = attr.st_size
    except IOError:
        pass
    remote_dir_cache[remote_dir] = sizes
    return sizes

def should_upload(sftp, local_path, remote_path, force=False):
    """파일 업로드 필요 여부 판단 (신규/크기변경/핵심파일 업로드)"""
    if force:
        return True
    rel_path = os.path.relpath(local_path, ROOT_DIR).replace('\\', '/')
    if rel_path in ALWAYS_REFRESH_FILES:
        return True
    
    remote_dir = posixpath.dirname(remote_path)
    filename = posixpath.basename(remote_path)
    remote_sizes = get_remote_file_sizes(sftp, remote_dir)
    
    if filename not in remote_sizes:
        return True  # 원격에 없는 신규 파일
    
    local_size = os.path.getsize(local_path)
    return local_size != remote_sizes[filename]

def upload_file_sftp(sftp, local_file_path, remote_file_path, force=False):
    remote_dir = posixpath.dirname(remote_file_path)
    if remote_dir:
        ensure_remote_dir_sftp(sftp, remote_dir)
    
    rel = os.path.relpath(local_file_path, ROOT_DIR).replace('\\', '/')
    if not should_upload(sftp, local_file_path, remote_file_path, force):
        return False
    
    sftp.put(local_file_path, remote_file_path)
    # 원격 캐시 갱신
    if remote_dir in remote_dir_cache:
        remote_dir_cache[remote_dir][posixpath.basename(remote_file_path)] = os.path.getsize(local_file_path)
    print(f"  ⬆️ 업로드 성공: {rel}")
    return True

def is_cdn_ip(ip):
    if not ip:
        return False
    if ip in KNOWN_CDN_IPS:
        return True
    if ip.startswith('147.93.') or ip.startswith('213.210.'):
        return True
    return False

def build_candidate_hosts(primary_host):
    """CDN 프록시 감지 및 연결 가능한 호스트 목록 구성"""
    candidates = []

    # 1. 원본 호스트 분석
    if primary_host:
        resolved_ip = None
        try:
            resolved_ip = socket.gethostbyname(primary_host)
        except Exception:
            pass

        if is_cdn_ip(resolved_ip) or is_cdn_ip(primary_host):
            print(f"⚠️ 안내: '{primary_host}'(IP: {resolved_ip})는 호스팅어 CDN/프록시로 SFTP 포트({PORT})가 차단됩니다.")
            print(f"🔄 실제 서버 IP({HOSTINGER_DIRECT_IP})로 자동 우회 연결합니다.")
        else:
            candidates.append((primary_host, resolved_ip))

    # 2. 우선순위 직접 IP 추가
    for h in [HOSTINGER_DIRECT_IP]:
        if not any(c[0] == h for c in candidates):
            try:
                ip = socket.gethostbyname(h)
            except Exception:
                ip = None
            candidates.append((h, ip))

    return candidates

def connect_with_failover(paramiko_module, candidates, port, username, password):
    """여러 호스트 후보군에 대해 재시도 및 페일오버를 수행하며 SFTP 연결"""
    last_error = None

    for host, ip in candidates:
        ip_display = f" (IP: {ip})" if ip and ip != host else ""
        print(f"🌐 호스팅어 서버 접속 시도: {host}{ip_display}:{port} (계정: {username})")

        for attempt in range(1, 4):
            client = paramiko_module.SSHClient()
            client.set_missing_host_key_policy(paramiko_module.AutoAddPolicy())
            try:
                # 클라우드 러너 환경에서의 타임아웃 방지를 위해 타임아웃 35초 및 배너/인증 타임아웃 설정
                client.connect(
                    host,
                    port=port,
                    username=username,
                    password=password,
                    timeout=35,
                    banner_timeout=35,
                    auth_timeout=35
                )
                print(f"✅ SFTP 인증 성공! (접속 대상: {host}:{port})")
                
                # 전송 중 연결 끊김 방지 KeepAlive 설정
                transport = client.get_transport()
                if transport:
                    transport.set_keepalive(15)

                sftp = client.open_sftp()
                return client, sftp
            except Exception as e:
                last_error = e
                print(f"  ⚠️ {host} 연결 시도 {attempt}/3 실패: {e}")
                try:
                    client.close()
                except Exception:
                    pass
                if attempt < 3:
                    time.sleep(3)

    raise last_error

def main():
    force_all = '--force' in sys.argv or '--all' in sys.argv or os.environ.get('FORCE_UPLOAD') == 'true'
    print("🚀 === 새한신용정보(saehanccm.com) 호스팅어(Hostinger) SFTP 자동 배포 시작 ===")
    if not check_credentials():
        sys.exit(1)

    try:
        import paramiko
    except ImportError:
        print("❌ paramiko 모듈이 필요합니다. (pip install paramiko)")
        sys.exit(1)

    try:
        candidates = build_candidate_hosts(SERVER)
        client, sftp = connect_with_failover(paramiko, candidates, PORT, USERNAME, PASSWORD)

        home_dir = sftp.normalize('.')
        
        if REMOTE_DIR.startswith('/'):
            target_base = REMOTE_DIR
        else:
            target_base = posixpath.join(home_dir, REMOTE_DIR)

        print(f"📂 원격 작업 디렉토리: {target_base}")
        ensure_remote_dir_sftp(sftp, target_base)

        uploaded_count = 0
        total_scanned = 0

        # 사이트 내 모든 공개 파일 및 디렉토리 자동 스캔 및 배포
        for item in sorted(os.listdir(ROOT_DIR)):
            item_path = os.path.join(ROOT_DIR, item)
            
            # 루트 개별 파일
            if os.path.isfile(item_path):
                if item in EXCLUDE_FILES or item.startswith('.'):
                    continue
                total_scanned += 1
                remote_file = posixpath.join(target_base, item)
                if upload_file_sftp(sftp, item_path, remote_file, force=force_all):
                    uploaded_count += 1
                    
            # 하위 디렉토리 (assets, data, posts 등)
            elif os.path.isdir(item_path):
                if item in EXCLUDE_DIRS or item.startswith('.'):
                    continue
                for root, dirs, files in os.walk(item_path):
                    # 제외 대상 폴더 필터링
                    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
                    rel_dir = os.path.relpath(root, ROOT_DIR).replace('\\', '/')
                    remote_dir = posixpath.join(target_base, rel_dir)
                    ensure_remote_dir_sftp(sftp, remote_dir)
                    
                    for file in sorted(files):
                        if file in EXCLUDE_FILES or file.startswith('.'):
                            continue
                        local_file = os.path.join(root, file)
                        remote_file = posixpath.join(remote_dir, file)
                        total_scanned += 1
                        if upload_file_sftp(sftp, local_file, remote_file, force=force_all):
                            uploaded_count += 1

        sftp.close()
        client.close()

        print(f"\n🎉 호스팅어 서버 배포 완료! (검사: {total_scanned}개 파일, 전송/갱신: {uploaded_count}개 파일)")
        print("👉 라이브 확인 주소:")
        print("   - 메인 사이트: https://saehanccm.com/")
        print("   - 칼럼 정보마당: https://saehanccm.com/posts/")
        print("   - 사이트맵: https://saehanccm.com/sitemap.xml")
        print("   - 로봇 수집파일: https://saehanccm.com/robots.txt")

    except Exception as e:
        print(f"❌ SFTP 배포 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
