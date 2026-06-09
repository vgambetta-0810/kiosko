import { useEffect } from 'react';

export default function usePosKeyboard({
  isModalOpen,
  onEscape,
  onFocusBarcode,
  onGoCheckout,
  onFinalize,
  canGoCheckout,
  canFinalize
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const targetTag = event.target?.tagName;
      const isTypingField = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (event.key === 'Escape' && isModalOpen) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        onFocusBarcode();
        return;
      }

      if (event.key === 'F4' && canGoCheckout) {
        event.preventDefault();
        onGoCheckout();
        return;
      }

      if (event.ctrlKey && event.key === 'Enter' && canFinalize) {
        event.preventDefault();
        onFinalize();
        return;
      }

      if (event.key === 'Escape' && !isModalOpen) {
        event.preventDefault();
        onFocusBarcode();
        return;
      }

      if (isTypingField && event.key !== 'F2' && event.key !== 'F4') {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, onEscape, onFocusBarcode, onGoCheckout, onFinalize, canGoCheckout, canFinalize]);
}
