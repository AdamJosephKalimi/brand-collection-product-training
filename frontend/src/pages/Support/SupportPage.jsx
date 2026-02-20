import React from 'react';
import TopNav from '../../components/features/TopNav/TopNav';
import Footer from '../../components/features/Footer/Footer';
import styles from './SupportPage.module.css';

const navLinks = [
  { path: '/', label: 'Dashboard' },
  { path: '/generated-decks', label: 'Generated Decks' },
  { path: '/settings', label: 'Settings' }
];

const faqItems = [
  {
    question: 'My items did not extract correctly from the documents',
    answer:
      'Make sure your line sheet is formatted consistently with column headers in the first row. If items are missing or have incorrect data, try re-uploading the document. Proko works best with clean, well-structured spreadsheets and PDFs that have selectable text (not scanned images).'
  },
  {
    question: 'Images are missing from my generated deck',
    answer:
      'Images are extracted directly from your uploaded documents. If images are missing, check that your original document contains embedded images rather than linked references. For best results, use high-resolution images in your line sheets.'
  },
  {
    question: 'My deck generated in the wrong language',
    answer:
      'Proko generates intro slide content based on the brand and collection context documents you uploaded. If those documents are in a different language, the generated text will follow that language. Upload context documents in your preferred language.'
  },
  {
    question: 'The download did not start automatically',
    answer:
      'Check that your browser allows downloads from this site. If the automatic download was blocked, you can find the deck on the Generated Decks page and download it from there.'
  },
  {
    question: 'How do I change the fonts on my deck?',
    answer:
      'Go to your brand edit page and look for the Typography section. There you can set heading and body font families as well as a font color. Changes apply the next time you generate a deck.'
  },
  {
    question: 'Can I reorder the categories in my deck?',
    answer:
      'Yes. In Deck Settings, drag the categories into the order you want. The order you set in the categories list is the order they appear in the generated deck.'
  },
  {
    question: 'What file formats are supported for upload?',
    answer:
      'Line sheets: PDF, XLSX, XLS, CSV. Brand and collection context documents: PDF, DOCX, TXT (up to 25 MB each). Purchase orders: PDF, XLSX, XLS, CSV.'
  }
];

function SupportPage() {
  return (
    <div className={styles.pageContainer}>
      <TopNav links={navLinks} />

      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>Support</h1>
          <p className={styles.subtitle}>
            Get help, find answers, and share your ideas.
          </p>
        </div>

        {/* Contact Card */}
        <div className={styles.contactCard}>
          <div className={styles.contactIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div className={styles.contactBody}>
            <p className={styles.contactLabel}>Email Support</p>
            <p className={styles.contactDetail}>
              Reach us at{' '}
              <a href="mailto:support@proko.ai" className={styles.emailLink}>
                support@proko.ai
              </a>
              {' '} — we typically respond within one business day.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          {faqItems.map((item, index) => (
            <div key={index} className={styles.faqCard}>
              <h3 className={styles.faqQuestion}>{item.question}</h3>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </div>
          ))}
        </div>

        {/* Feature Requests */}
        <div className={styles.featureCard}>
          <h2 className={styles.featureTitle}>Feature Requests</h2>
          <p className={styles.text}>
            Have an idea for how Proko could work better for you? We would love to hear it.
            Send your suggestions to{' '}
            <a href="mailto:support@proko.ai" className={styles.emailLink}>
              support@proko.ai
            </a>{' '}
            and our team will review them.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default SupportPage;
