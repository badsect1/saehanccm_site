// ==========================================================================
// 새한신용정보 채권회수 정보마당 스크립트 (검색, 카테고리 필터링, FAQ 토글)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. 카테고리 필터링 및 검색 기능 (목록 허브 페이지)
  const catButtons = document.querySelectorAll('.cat-btn');
  const postCards = document.querySelectorAll('.post-card');
  const searchInput = document.querySelector('.hero-search-input');
  const postCountBadge = document.querySelector('.post-count-badge');
  const emptyState = document.querySelector('.empty-state');

  let currentCategory = 'all';
  let currentSearch = '';

  function filterPosts() {
    if (!postCards.length) return;

    let visibleCount = 0;
    postCards.forEach(card => {
      const cardCat = card.getAttribute('data-category') || '';
      const cardTitle = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
      const cardSummary = (card.querySelector('.card-summary')?.textContent || '').toLowerCase();
      const cardRegion = (card.getAttribute('data-region') || '').toLowerCase();

      const matchesCat = (currentCategory === 'all' || cardCat === currentCategory);
      const matchesSearch = !currentSearch ||
        cardTitle.includes(currentSearch) ||
        cardSummary.includes(currentSearch) ||
        cardRegion.includes(currentSearch);

      if (matchesCat && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (postCountBadge) {
      postCountBadge.textContent = `총 ${visibleCount}개의 칼럼`;
    }

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category') || 'all';
      filterPosts();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      filterPosts();
    });
  }

  // 2. FAQ 아코디언 토글 (상세 아티클 페이지)
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isOpen) {
          item.classList.add('active');
        }
      });
    }
  });
});
