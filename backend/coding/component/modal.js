import '../style/modal.scss';

function Modal({ isOpen, setIsOpen, children }) {
  if (!isOpen) return;

  return (
    <div className="modal-overlay">
      <div className="modal-content-box">{children}</div>
    </div>
  );
}

export default Modal;
