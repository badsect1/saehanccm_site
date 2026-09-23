"""
새한신용정보(saehanccm.com) - 호스팅어(Hostinger) SFTP / SSH 자동 동기화 배포 스크립트
호스팅어의 보안 SSH / SFTP 포트(65002)를 활용하여 가장 빠르고 안전하게 배포합니다.
"""

import os
import sys
import posixpath

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 루트 디렉토리 및 .env 파싱
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(ROOT_DIR, '.env')

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

def clean_str(val):
    if not val:
        return ""
    v = str(val).strip()
    for prefix in ['sftp://', 'ftp://', 'ssh://', 'https://', 'http://']:
        if v.startswith(prefix):
            v = v[len(prefix):]
    v = v.rstrip('/')
    if ':' in v and v.count(':') == 1 and not v.startswith('['):
        v = v.split(':')[0]
    return v.strip()

def clean_password(val):
    if not val:
        return ""
    return str(val).strip('\r\n')

raw_server = config.get('FTP_SERVER') or os.environ.get('FTP_SERVER') or '145.79.25.99'
SERVER = clean_str(raw_server)

raw_user = config.get('FTP_USERNAME') or os.environ.get('FTP_USERNAME') or 'u687833262'
USERNAME = clean_str(raw_user)

raw_pw = config.get('FTP_PASSWORD') or os.environ.get('FTP_PASSWORD')
PASSWORD = clean_password(raw_pw)

raw_port = config.get('FTP_PORT') or os.environ.get('FTP_PORT') or 65002
try:
    PORT = int(clean_str(raw_port))
except ValueError:
    PORT = 65002

raw_dir = config.get('FTP_REMOTE_DIR') or os.environ.get('FTP_REMOTE_DIR') or 'domains/saehanccm.com/public_html'
REMOTE_DIR = clean_str(raw_dir)

def check_credentials():
    if not SERVER or not USERNAME or not PASSWORD:
        print("❌ 서버 접속 정보가 설정되지 않았습니다. .env 파일 또는 GitHub Secrets를 확인해주세요.")
        return False
    return True

def ensure_remote_dir_sftp(sftp, remote_dir):
    """원격 SFTP 디렉토리가 없으면 계층별로 순차 생성"""
    parts = remote_dir.strip('/').split('/')
    current = "/" if remote_dir.startswith('/') else ""
    for part in parts:
        current = posixpath.join(current, part)
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass

def upload_file_sftp(sftp, local_file_path, remote_file_path):
    remote_dir = posixpath.dirname(remote_file_path)
    if remote_dir:
        ensure_remote_dir_sftp(sftp, remote_dir)
    sftp.put(local_file_path, remote_file_path)
    rel = os.path.relpath(local_file_path, ROOT_DIR).replace('\\', '/')
    print(f"  ⬆️ 업로드 성공: {rel}")

def upload_directory_sftp(sftp, local_dir, base_remote_dir):
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, ROOT_DIR).replace('\\', '/')
        remote_target_dir = posixpath.join(base_remote_dir, rel_path)
        ensure_remote_dir_sftp(sftp, remote_target_dir)

        for file in files:
            local_path = os.path.join(root, file)
            remote_path = posixpath.join(remote_target_dir, file)
            upload_file_sftp(sftp, local_path, remote_path)

def main():
    print("🚀 === 호스팅어(Hostinger) SFTP 자동 배포 시작 ===")
    if not check_credentials():
        sys.exit(1)

    try:
        import paramiko
    except ImportError:
        print("❌ paramiko 모듈이 필요합니다. (pip install paramiko)")
        sys.exit(1)

    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # 호스팅어 고정 SFTP IP (145.79.25.99)
        DEFAULT_HOSTINGER_IP = '145.79.25.99'
        targets = [SERVER]
        if SERVER != DEFAULT_HOSTINGER_IP:
            targets.append(DEFAULT_HOSTINGER_IP)

        connected = False
        last_error = None

        for target in targets:
            print(f"🌐 호스팅어 서버 접속 시도: {target}:{PORT} (계정: {USERNAME})")
            try:
                client.connect(target, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
                connected = True
                print(f"✅ SFTP 인증 성공! ({target}:{PORT})")
                break
            except Exception as e:
                last_error = e
                print(f"⚠️ {target} 접속 실패 ({e}), 다른 연결 경로로 시도합니다...")

        if not connected:
            raise last_error

        sftp = client.open_sftp()
        home_dir = sftp.normalize('.')
        
        if REMOTE_DIR.startswith('/'):
            target_base = REMOTE_DIR
        else:
            target_base = posixpath.join(home_dir, REMOTE_DIR)

        print(f"📂 원격 작업 디렉토리: {target_base}")
        ensure_remote_dir_sftp(sftp, target_base)

        # 1. 단일 핵심 파일 업로드 (sitemap, robots, index)
        key_files = ['sitemap.xml', 'robots.txt', 'index.html']
        for kf in key_files:
            local_path = os.path.join(ROOT_DIR, kf)
            if os.path.exists(local_path):
                remote_path = posixpath.join(target_base, kf)
                upload_file_sftp(sftp, local_path, remote_path)

        # 2. data/ 폴더 업로드
        data_dir = os.path.join(ROOT_DIR, 'data')
        if os.path.exists(data_dir):
            upload_directory_sftp(sftp, data_dir, target_base)

        # 3. posts/ 폴더 업로드 (전체 칼럼 및 스타일, 스크립트)
        posts_dir = os.path.join(ROOT_DIR, 'posts')
        if os.path.exists(posts_dir):
            upload_directory_sftp(sftp, posts_dir, target_base)

        sftp.close()
        client.close()

        print("\n🎉 축하합니다! 호스팅어 서버로 모든 최신 칼럼과 사이트맵 배포가 완료되었습니다!")
        print("👉 라이브 확인 주소:")
        print("   - 메인 사이트: https://saehanccm.com/")
        print("   - 칼럼 정보마당: https://saehanccm.com/posts/")
        print("   - 사이트맵: https://saehanccm.com/sitemap.xml")

    except Exception as e:
        print(f"❌ SFTP 배포 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
