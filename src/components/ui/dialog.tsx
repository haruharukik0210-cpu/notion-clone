import * as React from 'react';
import { FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';

import '../../styles/components/dialog.css';

// Context for Dialog
interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

// Root Component
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  modal?: boolean;
}

const Dialog: React.FC<DialogProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Trigger Component
interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('DialogTrigger must be used within Dialog');

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      context.onOpenChange(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

// Portal Component (for compatibility)
const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Close Component
interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('DialogClose must be used within Dialog');

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      context.onOpenChange(false);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DialogClose.displayName = 'DialogClose';

// Overlay Component
const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) return null;
    if (!context.open) return null;

    return (
      <div
        ref={ref}
        className={`dialog-overlay ${className || ''}`}
        onClick={() => context.onOpenChange(false)}
        {...props}
      />
    );
  }
);
DialogOverlay.displayName = 'DialogOverlay';

// Content Component
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent) => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onEscapeKeyDown, onPointerDownOutside, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('DialogContent must be used within Dialog');

    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => contentRef.current!);

    // Handle Escape key
    React.useEffect(() => {
      if (!context.open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onEscapeKeyDown?.(e);
          context.onOpenChange(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [context.open, onEscapeKeyDown]);

    // Handle click outside
    React.useEffect(() => {
      if (!context.open) return;

      const handlePointerDown = (e: PointerEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onPointerDownOutside?.(e);
          context.onOpenChange(false);
        }
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [context.open, onPointerDownOutside]);

    // Focus trap
    React.useEffect(() => {
      if (!context.open || !contentRef.current) return;

      const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, [context.open]);

    if (!context.open) return null;

    const content = (
      <>
        <DialogOverlay />
        <div
          ref={contentRef}
          className={`dialog-content ${className || ''}`}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {children}
          <button className="dialog-close" onClick={() => context.onOpenChange(false)}>
            <FiX className="dialog-close-icon" size={16} />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </>
    );

    return createPortal(content, document.body);
  }
);
DialogContent.displayName = 'DialogContent';

// Header Component
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`dialog-header ${className || ''}`}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

// Footer Component
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`dialog-footer ${className || ''}`}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

// Title Component
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={`dialog-title ${className || ''}`}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';

// Description Component
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`dialog-description ${className || ''}`}
      {...props}
    />
  )
);
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
