import { useEffect } from 'react';

export default function usePosKeyboard({
  isModalOpen,
  onEscape,
  onFocusSku,
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
        onFocusSku();
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

      if (isTypingField && event.key !== 'F2' && event.key !== 'F4') {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, onEscape, onFocusSku, onGoCheckout, onFinalize, canGoCheckout, canFinalize]);
}
