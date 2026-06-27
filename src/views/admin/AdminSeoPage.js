'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import { fetchBlogPosts, mapBlogPostToSeoItem, updateBlogPost } from '@/api/blogApi';

const SEO_TYPES = [
  { value: 'all', label: 'الكل' },
  { value: 'hotel', label: 'الفنادق' },
  { value: 'blog', label: 'المدونة' },
  { value: 'city', label: 'المدن' },
  { value: 'page', label: 'صفحات عامة' },
];

const SEO_STATUS = {
  good: { label: 'جيد', className: 'is-good' },
  warning: { label: 'يحتاج تحسين', className: 'is-warning' },
  poor: { label: 'ضعيف', className: 'is-poor' },
};

const INITIAL_SEO_ITEMS = [
  {
    id: 1,
    type: 'hotel',
    title: 'فندق المحيط دبي',
    url: '/hotel/almohit-dubai',
    status: 'warning',
    language: 'ar',
    city: 'Dubai',
    updated_at: '2026-06-24',
    seo: {
      ar: {
        meta_title: 'فندق المحيط دبي | احجز أفضل إقامة عبر Almohit',
        meta_description: 'احجز فندق المحيط في دبي بأفضل الأسعار، غرف مريحة، موقع ممتاز، وخدمات مناسبة للعائلات والمسافرين.',
        slug: 'almohit-dubai-hotel',
        focus_keyword: 'فندق المحيط دبي',
        og_title: 'فندق المحيط دبي',
        og_description: 'اكتشف فندق المحيط دبي واحجز إقامتك بسهولة عبر Almohit.',
        image_alt: 'واجهة فندق المحيط دبي',
      },
      en: {
        meta_title: 'Almohit Hotel Dubai | Book Your Stay',
        meta_description: 'Book Almohit Hotel in Dubai with great rates, comfortable rooms, and a convenient location.',
        slug: 'almohit-dubai-hotel',
        focus_keyword: 'Almohit Hotel Dubai',
        og_title: 'Almohit Hotel Dubai',
        og_description: 'Discover Almohit Hotel Dubai and book your stay with Almohit.',
        image_alt: 'Almohit Hotel Dubai exterior',
      },
    },
  },
  {
    id: 2,
    type: 'blog',
    title: 'أفضل فنادق دبي للعائلات',
    url: '/blog/best-family-hotels-dubai',
    status: 'good',
    language: 'ar',
    city: 'Dubai',
    updated_at: '2026-06-20',
    seo: {
      ar: {
        meta_title: 'أفضل فنادق دبي للعائلات | دليل Almohit',
        meta_description: 'دليل شامل لأفضل فنادق دبي المناسبة للعائلات مع نصائح لاختيار الفندق الأنسب وموقع الإقامة الأفضل.',
        slug: 'best-family-hotels-dubai',
        focus_keyword: 'أفضل فنادق دبي للعائلات',
        og_title: 'أفضل فنادق دبي للعائلات',
        og_description: 'تعرف على أفضل فنادق دبي للعائلات واحجز بسهولة.',
        image_alt: 'فنادق دبي للعائلات',
      },
      en: {
        meta_title: 'Best Family Hotels in Dubai | Almohit Guide',
        meta_description: 'A complete guide to the best family-friendly hotels in Dubai with booking tips.',
        slug: 'best-family-hotels-dubai',
        focus_keyword: 'best family hotels in Dubai',
        og_title: 'Best Family Hotels in Dubai',
        og_description: 'Explore family-friendly hotels in Dubai and book easily.',
        image_alt: 'Family hotels in Dubai',
      },
    },
  },
  {
    id: 3,
    type: 'city',
    title: 'فنادق كوالالمبور',
    url: '/search?city=Kuala%20Lumpur',
    status: 'poor',
    language: 'ar',
    city: 'Kuala Lumpur',
    updated_at: '2026-06-18',
    seo: {
      ar: {
        meta_title: '',
        meta_description: '',
        slug: 'hotels-kuala-lumpur',
        focus_keyword: 'فنادق كوالالمبور',
        og_title: '',
        og_description: '',
        image_alt: '',
      },
      en: {
        meta_title: '',
        meta_description: '',
        slug: 'hotels-kuala-lumpur',
        focus_keyword: 'hotels in Kuala Lumpur',
        og_title: '',
        og_description: '',
        image_alt: '',
      },
    },
  },
];

function getTypeLabel(type) {
  const found = SEO_TYPES.find((item) => item.value === type);
  return found?.label || type;
}

function countFilledFields(localeSeo) {
  return Object.values(localeSeo || {}).filter((value) => String(value || '').trim()).length;
}

function calculateSeoScore(localeSeo) {
  if (!localeSeo) return 0;

  let score = 0;

  const titleLength = localeSeo.meta_title?.trim().length || 0;
  const descriptionLength = localeSeo.meta_description?.trim().length || 0;
  const slugLength = localeSeo.slug?.trim().length || 0;
  const keywordLength = localeSeo.focus_keyword?.trim().length || 0;
  const imageAltLength = localeSeo.image_alt?.trim().length || 0;
  const ogTitleLength = localeSeo.og_title?.trim().length || 0;
  const ogDescriptionLength = localeSeo.og_description?.trim().length || 0;

  if (titleLength >= 30 && titleLength <= 65) score += 20;
  else if (titleLength > 0) score += 10;

  if (descriptionLength >= 120 && descriptionLength <= 170) score += 25;
  else if (descriptionLength > 0) score += 12;

  if (slugLength >= 3) score += 15;
  if (keywordLength >= 3) score += 15;
  if (imageAltLength >= 5) score += 10;
  if (ogTitleLength >= 5) score += 7;
  if (ogDescriptionLength >= 20) score += 8;

  return Math.min(score, 100);
}

function getSeoStatusByScore(score) {
  if (score >= 80) return 'good';
  if (score >= 45) return 'warning';
  return 'poor';
}

function buildSeoIssues(localeSeo) {
  const issues = [];

  const titleLength = localeSeo.meta_title?.trim().length || 0;
  const descriptionLength = localeSeo.meta_description?.trim().length || 0;

  if (!localeSeo.meta_title?.trim()) {
    issues.push({ type: 'error', text: 'عنوان SEO غير موجود.' });
  } else if (titleLength < 30) {
    issues.push({ type: 'warning', text: 'عنوان SEO قصير، الأفضل بين 30 و 65 حرف.' });
  } else if (titleLength > 65) {
    issues.push({ type: 'warning', text: 'عنوان SEO طويل وقد يتم قصّه في Google.' });
  }

  if (!localeSeo.meta_description?.trim()) {
    issues.push({ type: 'error', text: 'وصف SEO غير موجود.' });
  } else if (descriptionLength < 120) {
    issues.push({ type: 'warning', text: 'وصف SEO قصير، الأفضل بين 120 و 170 حرف.' });
  } else if (descriptionLength > 170) {
    issues.push({ type: 'warning', text: 'وصف SEO طويل وقد يتم قصّه في Google.' });
  }

  if (!localeSeo.slug?.trim()) {
    issues.push({ type: 'error', text: 'الرابط Slug غير موجود.' });
  }

  if (!localeSeo.focus_keyword?.trim()) {
    issues.push({ type: 'warning', text: 'لم يتم تحديد الكلمة المفتاحية المستهدفة.' });
  }

  if (!localeSeo.image_alt?.trim()) {
    issues.push({ type: 'warning', text: 'نص Alt للصورة غير موجود.' });
  }

  if (!localeSeo.og_title?.trim() || !localeSeo.og_description?.trim()) {
    issues.push({ type: 'info', text: 'بيانات المشاركة على السوشيال غير مكتملة.' });
  }

  return issues;
}

export default function AdminSeoPage() {
  const [items, setItems] = useState(INITIAL_SEO_ITEMS.filter((item) => item.type !== 'blog'));
  const [selectedId, setSelectedId] = useState(INITIAL_SEO_ITEMS[0]?.id);
  const [activeType, setActiveType] = useState('all');
  const [activeLocale, setActiveLocale] = useState('en');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchBlogPosts()
      .then((posts) => {
        if (cancelled) return;
        const blogItems = posts.map(mapBlogPostToSeoItem);
        setItems((prev) => {
          const nonBlog = prev.filter((item) => item.type !== 'blog');
          return [...nonBlog, ...blogItems];
        });
        if (blogItems.length) {
          setSelectedId((current) => current || blogItems[0].id);
        }
      })
      .catch((error) => {
        console.error('Failed to load blog SEO items', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = activeType === 'all' || item.type === activeType;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [items, activeType, search]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) || items[0];
  }, [items, selectedId]);

  const localeSeo = selectedItem?.seo?.[activeLocale] || {};
  const currentScore = calculateSeoScore(localeSeo);
  const currentStatus = getSeoStatusByScore(currentScore);
  const currentIssues = buildSeoIssues(localeSeo);

  const stats = useMemo(() => {
    const total = items.length;
    const good = items.filter((item) => {
      const score = calculateSeoScore(item.seo?.ar);
      return score >= 80;
    }).length;

    const warning = items.filter((item) => {
      const score = calculateSeoScore(item.seo?.ar);
      return score >= 45 && score < 80;
    }).length;

    const poor = items.filter((item) => {
      const score = calculateSeoScore(item.seo?.ar);
      return score < 45;
    }).length;

    const avg = total
      ? Math.round(
          items.reduce((sum, item) => sum + calculateSeoScore(item.seo?.ar), 0) / total
        )
      : 0;

    return { total, good, warning, poor, avg };
  }, [items]);

  const updateSeoField = (field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id) return item;

        return {
          ...item,
          seo: {
            ...item.seo,
            [activeLocale]: {
              ...item.seo[activeLocale],
              [field]: value,
            },
          },
        };
      })
    );
  };

  const copyFromArabicToEnglish = () => {
    if (!selectedItem) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id) return item;

        return {
          ...item,
          seo: {
            ...item.seo,
            en: {
              ...item.seo.en,
              meta_title: item.seo.ar.meta_title,
              meta_description: item.seo.ar.meta_description,
              og_title: item.seo.ar.og_title,
              og_description: item.seo.ar.og_description,
              image_alt: item.seo.ar.image_alt,
            },
          },
        };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);

    try {
      if (selectedItem.type === 'blog') {
        const seoAr = selectedItem.seo?.ar || {};
        const seoEn = selectedItem.seo?.en || {};
        await updateBlogPost(selectedItem.id, {
          meta_title: seoEn.meta_title || null,
          meta_title_ar: seoAr.meta_title || null,
          meta_description: seoEn.meta_description || null,
          meta_description_ar: seoAr.meta_description || null,
          featured_image_alt: seoEn.image_alt || seoAr.image_alt || ''
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      alert('تم حفظ إعدادات SEO بنجاح');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-seo-page">
        <p className="admin-muted">جاري تحميل بيانات SEO...</p>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <main className="admin-seo-page">
        <div className="admin-seo-empty">
          لا توجد صفحات لإدارة SEO حالياً.
        </div>
      </main>
    );
  }

  return (
    <main className="admin-seo-page" dir="rtl">
      <header className="admin-seo-header">
        <div>
          <span className="admin-seo-eyebrow">إدارة الظهور في Google</span>
          <h1>إدارة SEO</h1>
          <p>
            راقب وحسّن صفحات الفنادق، المقالات، والمدن لتحويل الزوار من Google إلى بحث وحجز.
          </p>
        </div>

        <div className="admin-seo-header-actions">
          <button type="button" className="admin-btn admin-btn-secondary">
            <Icon name="eye" size={16} />
            <span>معاينة الموقع</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Icon name="check" size={16} />
            <span>{saving ? 'جارِ الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </header>

      <section className="admin-seo-stats-grid">
        <SeoStatCard label="إجمالي الصفحات" value={stats.total} icon="file-text" />
        <SeoStatCard label="متوسط الجاهزية" value={`${stats.avg}%`} icon="bar-chart" />
        <SeoStatCard label="صفحات جيدة" value={stats.good} icon="check" tone="good" />
        <SeoStatCard label="تحتاج تحسين" value={stats.warning + stats.poor} icon="alert-circle" tone="warning" />
      </section>

      <section className="admin-seo-workspace">
        <aside className="admin-seo-sidebar">
          <div className="admin-seo-filter-card">
            <label htmlFor="seo-search">بحث</label>
            <div className="admin-seo-search">
              <Icon name="search" size={16} />
              <input
                id="seo-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الفندق، المقال، المدينة..."
              />
            </div>

            <div className="admin-seo-type-tabs">
              {SEO_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={activeType === type.value ? 'is-active' : ''}
                  onClick={() => setActiveType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-seo-list">
            {filteredItems.map((item) => {
              const itemScore = calculateSeoScore(item.seo?.ar);
              const status = getSeoStatusByScore(itemScore);
              const statusMeta = SEO_STATUS[status];

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-seo-list-item ${selectedItem.id === item.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="admin-seo-list-item__top">
                    <strong>{item.title}</strong>
                    <span className={`seo-status-badge ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="admin-seo-list-item__meta">
                    <span>{getTypeLabel(item.type)}</span>
                    <span>{itemScore}%</span>
                  </div>

                  <small>{item.url}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="admin-seo-editor">
          <div className="admin-seo-editor-header">
            <div>
              <span className="admin-seo-editor-type">{getTypeLabel(selectedItem.type)}</span>
              <h2>{selectedItem.title}</h2>
              <p>{selectedItem.url}</p>
            </div>

            <div className="admin-seo-score">
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <path
                  className="admin-seo-score-bg"
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`admin-seo-score-fill ${SEO_STATUS[currentStatus].className}`}
                  strokeDasharray={`${currentScore}, 100`}
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <strong>{currentScore}%</strong>
              <span>SEO Score</span>
            </div>
          </div>

          <div className="admin-seo-locale-tabs">
            <button
              type="button"
              className={activeLocale === 'en' ? 'is-active' : ''}
              onClick={() => setActiveLocale('en')}
            >
              English
            </button>
            <button
              type="button"
              className={activeLocale === 'ar' ? 'is-active' : ''}
              onClick={() => setActiveLocale('ar')}
            >
              العربية
            </button>

            <button
              type="button"
              className="admin-seo-copy-btn"
              onClick={copyFromArabicToEnglish}
            >
              نسخ العربي للإنجليزي
            </button>
          </div>

          <div className="admin-seo-editor-grid">
            <div className="admin-seo-form-card">
              <h3>بيانات Google</h3>

              <SeoField
                label="Meta Title"
                value={localeSeo.meta_title}
                onChange={(value) => updateSeoField('meta_title', value)}
                max={65}
                placeholder="مثال: أفضل فنادق دبي | احجز عبر Almohit"
              />

              <SeoTextarea
                label="Meta Description"
                value={localeSeo.meta_description}
                onChange={(value) => updateSeoField('meta_description', value)}
                max={170}
                placeholder="اكتب وصفاً جذاباً يظهر في نتائج Google ويشجع الزائر على الدخول."
              />

              <SeoField
                label="Slug"
                value={localeSeo.slug}
                onChange={(value) =>
                  updateSeoField(
                    'slug',
                    value
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, '-')
                      .replace(/[^\u0600-\u06FFa-z0-9-]/gi, '')
                  )
                }
                placeholder="best-hotels-dubai"
              />

              <SeoField
                label="Focus Keyword"
                value={localeSeo.focus_keyword}
                onChange={(value) => updateSeoField('focus_keyword', value)}
                placeholder="مثال: أفضل فنادق دبي"
              />
            </div>

            <div className="admin-seo-form-card">
              <h3>المشاركة والصور</h3>

              <SeoField
                label="OG Title"
                value={localeSeo.og_title}
                onChange={(value) => updateSeoField('og_title', value)}
                max={70}
                placeholder="العنوان عند مشاركة الرابط"
              />

              <SeoTextarea
                label="OG Description"
                value={localeSeo.og_description}
                onChange={(value) => updateSeoField('og_description', value)}
                max={180}
                placeholder="الوصف عند مشاركة الرابط على السوشيال"
              />

              <SeoField
                label="Image Alt Text"
                value={localeSeo.image_alt}
                onChange={(value) => updateSeoField('image_alt', value)}
                placeholder="وصف مختصر للصورة يساعد Google وذوي الاحتياجات"
              />
            </div>
          </div>

          <div className="admin-seo-bottom-grid">
            <GooglePreview
              title={localeSeo.meta_title}
              description={localeSeo.meta_description}
              url={`https://almohit.com${selectedItem.url}`}
            />

            <SeoIssues issues={currentIssues} />
          </div>
        </section>
      </section>
    </main>
  );
}

function SeoStatCard({ label, value, icon, tone = 'default' }) {
  return (
    <article className={`admin-seo-stat-card tone-${tone}`}>
      <div className="admin-seo-stat-icon">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SeoField({ label, value, onChange, placeholder, max }) {
  const count = String(value || '').length;

  return (
    <div className="admin-seo-field">
      <div className="admin-seo-field-label">
        <label>{label}</label>
        {max ? (
          <span className={count > max ? 'is-over' : ''}>
            {count}/{max}
          </span>
        ) : null}
      </div>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SeoTextarea({ label, value, onChange, placeholder, max }) {
  const count = String(value || '').length;

  return (
    <div className="admin-seo-field">
      <div className="admin-seo-field-label">
        <label>{label}</label>
        {max ? (
          <span className={count > max ? 'is-over' : ''}>
            {count}/{max}
          </span>
        ) : null}
      </div>
      <textarea
        rows={4}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function GooglePreview({ title, description, url }) {
  return (
    <section className="admin-seo-preview-card">
      <div className="admin-seo-card-title">
        <Icon name="search" size={16} />
        <h3>معاينة Google</h3>
      </div>

      <div className="google-preview-box">
        <span className="google-preview-url">{url}</span>
        <h4>{title || 'عنوان الصفحة سيظهر هنا'}</h4>
        <p>
          {description ||
            'وصف الصفحة سيظهر هنا. اكتب وصفاً واضحاً يساعد الزائر على فهم الصفحة والضغط عليها من نتائج البحث.'}
        </p>
      </div>
    </section>
  );
}

function SeoIssues({ issues }) {
  return (
    <section className="admin-seo-issues-card">
      <div className="admin-seo-card-title">
        <Icon name="alert-circle" size={16} />
        <h3>قائمة التحسينات</h3>
      </div>

      {issues.length === 0 ? (
        <div className="admin-seo-success-state">
          <Icon name="check" size={18} />
          <span>ممتاز، لا توجد مشاكل واضحة في هذه اللغة.</span>
        </div>
      ) : (
        <div className="admin-seo-issues-list">
          {issues.map((issue, index) => (
            <div key={`${issue.text}-${index}`} className={`admin-seo-issue is-${issue.type}`}>
              <Icon
                name={issue.type === 'error' ? 'x' : issue.type === 'warning' ? 'alert-circle' : 'info'}
                size={15}
              />
              <span>{issue.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}