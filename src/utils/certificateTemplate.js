// Generates a Coursera-style certificate as an HTML string for expo-print

const CATEGORY_COLORS = {
  engineering: { primary: '#1B4332', accent: '#B7E4C7', gold: '#D4AF37' },
  ai:          { primary: '#0F3460', accent: '#A8D8EA', gold: '#D4AF37' },
  digital:     { primary: '#1B2A4A', accent: '#A8C7FF', gold: '#D4AF37' },
  math:        { primary: '#3B1F8C', accent: '#C9B8FF', gold: '#D4AF37' },
  psychology:  { primary: '#1A3A2A', accent: '#B7E4C7', gold: '#D4AF37' },
  business:    { primary: '#7C2D12', accent: '#FED7AA', gold: '#D4AF37' },
  finance:     { primary: '#14532D', accent: '#BBF7D0', gold: '#D4AF37' },
  art:         { primary: '#4A044E', accent: '#E9D5FF', gold: '#D4AF37' },
};

const DEFAULT_COLORS = { primary: '#1B4332', accent: '#B7E4C7', gold: '#D4AF37' };

const padNumber = (n) => String(n).padStart(2, '0');

const formatDate = (isoString) => {
  const d = new Date(isoString);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const buildCertificateHtml = (cert) => {
  const c = CATEGORY_COLORS[cert.category] || DEFAULT_COLORS;
  const date = formatDate(cert.issuedAt);
  const certIdValue = cert.certificateNumber || `EDUTOK-${cert.id.slice(-10).toUpperCase()}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #f0ede6; display: flex; align-items: center; justify-content: center; }

  /* Print: fill the page with only the certificate, no scrollbars or margins */
  @media print {
    @page {
      size: landscape;
      margin: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #fff !important;
      display: block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    .page {
      width: 100%;
      min-height: 100vh;
      box-shadow: none !important;
      border-radius: 0 !important;
      page-break-inside: avoid;
    }
  }

  .page { width: 900px; min-height: 636px; background: #fff; position: relative; font-family: 'Georgia', 'Times New Roman', serif; overflow: hidden; }

  /* Decorative corner borders */
  .corner { position: absolute; width: 80px; height: 80px; }
  .corner-tl { top: 16px; left: 16px; border-top: 3px solid ${c.gold}; border-left: 3px solid ${c.gold}; }
  .corner-tr { top: 16px; right: 16px; border-top: 3px solid ${c.gold}; border-right: 3px solid ${c.gold}; }
  .corner-bl { bottom: 16px; left: 16px; border-bottom: 3px solid ${c.gold}; border-left: 3px solid ${c.gold}; }
  .corner-br { bottom: 16px; right: 16px; border-bottom: 3px solid ${c.gold}; border-right: 3px solid ${c.gold}; }
  .border-outer { position: absolute; inset: 10px; border: 1.5px solid ${c.gold}33; pointer-events: none; }

  /* Header band */
  .header { background: ${c.primary}; padding: 22px 48px; display: flex; align-items: center; gap: 18px; }
  .header-logo { width: 44px; height: 44px; border-radius: 8px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800; font-family: Arial, sans-serif; }
  .header-text { flex: 1; }
  .platform-name { color: #fff; font-family: Arial, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
  .platform-tagline { color: rgba(255,255,255,0.65); font-family: Arial, sans-serif; font-size: 11px; margin-top: 2px; }
  .header-category { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.85); font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 4px 12px; border-radius: 20px; }

  /* Body */
  .body { padding: 36px 64px 28px; text-align: center; }
  .cert-label { font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; color: ${c.gold}; margin-bottom: 16px; }
  .cert-type-line { color: #555; font-size: 15px; margin-bottom: 6px; font-style: italic; }
  .student-name { font-size: 52px; font-weight: 700; color: ${c.primary}; line-height: 1.1; margin: 10px 0; letter-spacing: -0.5px; }
  .completed-line { color: #444; font-size: 15px; margin: 14px 0 6px; font-style: italic; }
  .course-name { font-size: 28px; font-weight: 700; color: ${c.primary}; margin: 4px 0 6px; line-height: 1.3; }
  .offered-line { color: #777; font-size: 12px; font-family: Arial, sans-serif; margin-bottom: 28px; }
  .org-name { color: ${c.primary}; font-weight: 700; }

  /* Gold divider */
  .divider { display: flex; align-items: center; gap: 12px; margin: 0 auto 28px; width: 320px; }
  .divider-line { flex: 1; height: 1px; background: ${c.gold}; }
  .divider-diamond { width: 8px; height: 8px; background: ${c.gold}; transform: rotate(45deg); }

  /* Footer row */
  .footer { display: flex; align-items: flex-end; justify-content: space-between; padding: 0 16px; margin-top: 4px; }

  /* Signature blocks */
  .sig-block { text-align: center; min-width: 160px; }
  .sig-name { font-size: 14px; font-weight: 700; color: #222; margin-bottom: 2px; font-family: Arial, sans-serif; }
  .sig-title { font-size: 10px; color: #888; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px; }
  .sig-line { border-top: 1.5px solid #ccc; margin-bottom: 6px; }

  /* Seal */
  .seal { width: 96px; height: 96px; border-radius: 50%; background: ${c.primary}; border: 4px solid ${c.gold}; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
  .seal-ring { position: absolute; inset: 4px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.2); }
  .seal-icon { color: ${c.gold}; font-size: 28px; line-height: 1; }
  .seal-text { color: rgba(255,255,255,0.8); font-size: 7px; font-family: Arial, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; text-align: center; }

  /* Cert ID strip */
  .cert-id-strip { background: #f8f5ee; border-top: 1px solid #e8e2d4; padding: 8px 64px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .cert-id-text { font-family: Arial, sans-serif; font-size: 9px; color: #aaa; }
  .cert-id-value { font-family: 'Courier New', monospace; font-size: 9px; color: #888; }
</style>
<script>
  /* Auto-trigger print once fonts and layout have settled */
  window.onload = function () {
    setTimeout(function () { window.print(); }, 400);
  };
</script>
</head>
<body>
<div class="page">
  <!-- Corner decorations -->
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  <div class="border-outer"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-logo">E</div>
    <div class="header-text">
      <div class="platform-name">EduTok</div>
      <div class="platform-tagline">Micro-Learning Platform</div>
    </div>
    <div class="header-category">${(cert.category || 'Learning').toUpperCase()}</div>
  </div>

  <!-- Body -->
  <div class="body">
    <div class="cert-label">Certificate of Completion</div>
    <div class="cert-type-line">This is to certify that</div>
    <div class="student-name">${cert.studentName}</div>
    <div class="completed-line">has successfully completed the course</div>
    <div class="course-name">${cert.courseName}</div>
    <div class="offered-line">
      offered by <span class="org-name">${cert.organizationName}</span>
      &nbsp;·&nbsp; ${cert.difficulty || 'Course'} Level
    </div>

    <div class="divider">
      <div class="divider-line"></div>
      <div class="divider-diamond"></div>
      <div class="divider-line"></div>
    </div>

    <!-- Footer signatures -->
    <div class="footer">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${cert.authorName}</div>
        <div class="sig-title">Instructor</div>
      </div>

      <div class="seal">
        <div class="seal-ring"></div>
        <div class="seal-icon">★</div>
        <div class="seal-text">Verified<br/>Completion</div>
      </div>

      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${date}</div>
        <div class="sig-title">Date of Completion</div>
      </div>
    </div>
  </div>

  <!-- Certificate ID strip -->
  <div class="cert-id-strip">
    <div class="cert-id-text">Certificate ID</div>
    <div class="cert-id-value">${certIdValue}</div>
    <div class="cert-id-text">Verify at edutok.app/verify</div>
  </div>
</div>
</body>
</html>`;
};
