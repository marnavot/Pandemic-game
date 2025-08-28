import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  show: boolean;
  titleColor?: string;
  isSidePanel?: boolean;
  zIndex?: string;
  maxWidth?: string;
  transparentBackdrop?: boolean;
  sidePanelWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, show, titleColor = 'text-white', isSidePanel = false, zIndex, maxWidth = 'max-w-md', transparentBackdrop = false, sidePanelWidth = 'w-[400px]'}) => {
  if (!show) {
    return null;
  }

  // Determine the z-index. Side panels need to be on top of regular modals.
  // Default to z-60 for side panels and z-50 for regular modals if no zIndex is provided.
  const effectiveZIndex = zIndex ?? (isSidePanel ? 'z-[60]' : 'z-50');
  
  if (isSidePanel) {
    return (
        <div className={`fixed top-0 right-0 h-full ${sidePanelWidth} bg-gray-800 bg-opacity-90 backdrop-blur-sm border-l-2 border-gray-600 ${effectiveZIndex} p-6 flex flex-col shadow-2xl animate-slide-in`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-orbitron ${titleColor}`}>{title}</h2>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                )}
            </div>
            <div className="text-gray-300 flex-grow overflow-y-auto">
                {children}
            </div>
        </div>
    );
  }

  const backdropClass = transparentBackdrop ? 'bg-black bg-opacity-25' : 'bg-black bg-opacity-75';

  return (
    <div className={`fixed inset-0 ${backdropClass} flex items-center justify-center transition-opacity duration-300 ${effectiveZIndex}`}>
      <div className={`bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl p-6 w-full ${maxWidth} mx-4 transform scale-95 hover:scale-100 transition-transform duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-orbitron ${titleColor}`}>{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          )}
        </div>
        <div className="text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;