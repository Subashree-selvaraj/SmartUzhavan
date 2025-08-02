import React from 'react';
import { useLanguage } from '../LanguageContext';
import './QuoteSection.css';

const QuoteSection = () => {
  const { lang } = useLanguage();
  
  const quotes = {
    en: {
      text: '"Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth, good morals, and happiness."',
      author: 'Thomas Jefferson'
    },
    ta: {
      text: 'கிருஷிகாரியம் நம் ஆழ்ந்த முயற்சியாகும், ஏனெனில் அது இறுதியில் உண்மை செல்வமும் நல்ல நற்றுணர்வும் மகிழ்ச்சியும் பெருக்குகிறது.',
      author: 'தலைவன் ஜெஃபர்சன்'
    }
  };

  return (
    <div className="quote-section">
      <div className="quote-content">
        {quotes[lang].text}
        <span className="quote-author">- {quotes[lang].author}</span>
      </div>
    </div>
  );
};

export default QuoteSection;
