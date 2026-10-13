import * as React from 'react';
import { FiCheck, FiChevronRight, FiCircle } from 'react-icons/fi';
import { createPortal } from 'react-dom';

import '../../styles/components/dropdown-menu.css';

// Context for DropdownMenu
interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(
  null
);

// Root Component
interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

// Trigger Component
interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLDivElement,
  DropdownMenuTriggerProps
>(({ children, asChild, onClick }, _ref) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context)
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    context.setOpen(!context.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: context.triggerRef,
      onClick: handleClick,
    });
  }

  return (
    <div
      ref={context.triggerRef as React.RefObject<HTMLDivElement>}
      onClick={handleClick}
    >
      {children}
    </div>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// Content Component
interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  alignOffset?: number;
  forceMount?: boolean;
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    {
      children,
      className,
      align = 'center',
      side = 'bottom',
      sideOffset = 4,
      alignOffset = 0,
      forceMount,
    },
    ref
  ) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context)
      throw new Error('DropdownMenuContent must be used within DropdownMenu');

    const contentRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    React.useImperativeHandle(ref, () => contentRef.current!);

    React.useEffect(() => {
      if (!context.open) return;

      const updatePosition = () => {
        if (!context.triggerRef.current || !contentRef.current) return;

        const triggerRect = context.triggerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // Calculate position based on side
        if (side === 'bottom') {
          top = triggerRect.bottom + sideOffset;
        } else if (side === 'top') {
          top = triggerRect.top - contentRect.height - sideOffset;
        } else if (side === 'right') {
          left = triggerRect.right + sideOffset;
          top = triggerRect.top;
        } else if (side === 'left') {
          left = triggerRect.left - contentRect.width - sideOffset;
          top = triggerRect.top;
        }

        // Calculate alignment
        if (side === 'bottom' || side === 'top') {
          if (align === 'start') {
            left = triggerRect.left + alignOffset;
          } else if (align === 'center') {
            left =
              triggerRect.left +
              triggerRect.width / 2 -
              contentRect.width / 2 +
              alignOffset;
          } else if (align === 'end') {
            left = triggerRect.right - contentRect.width + alignOffset;
          }
        } else {
          if (align === 'start') {
            top = triggerRect.top + alignOffset;
          } else if (align === 'center') {
            top =
              triggerRect.top +
              triggerRect.height / 2 -
              contentRect.height / 2 +
              alignOffset;
          } else if (align === 'end') {
            top = triggerRect.bottom - contentRect.height + alignOffset;
          }
        }

        setPosition({ top, left });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [context.open, align, side, sideOffset, alignOffset]);

    React.useEffect(() => {
      if (!context.open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(e.target as Node) &&
          context.triggerRef.current &&
          !context.triggerRef.current.contains(e.target as Node)
        ) {
          context.setOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          context.setOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [context.open]);

    if (!context.open && !forceMount) return null;

    const content = (
      <div
        ref={contentRef}
        className={`dropdown-menu-content ${
          !context.open ? 'dropdown-menu-content-hidden' : ''
        } ${className || ''}`}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {children}
      </div>
    );

    return createPortal(content, document.body);
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

// Item Component
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  asChild?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, inset, asChild, children, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    context?.setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return (
    <div
      ref={ref}
      className={`dropdown-menu-item ${
        inset ? 'dropdown-menu-item-inset' : ''
      } ${className || ''}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

// Separator Component
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-separator ${className || ''}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// Label Component
interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-label ${
      inset ? 'dropdown-menu-label-inset' : ''
    } ${className || ''}`}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// CheckboxItem Component
interface DropdownMenuCheckboxItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
}

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-checkbox-item ${className || ''}`}
    {...props}
  >
    <span className='dropdown-menu-checkbox-indicator'>
      {checked && (
        <FiCheck className='dropdown-menu-checkbox-indicator-icon' size={16} />
      )}
    </span>
    {children}
  </div>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// RadioItem Component
const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-radio-item ${className || ''}`}
    {...props}
  >
    <span className='dropdown-menu-radio-indicator'>
      <FiCircle className='dropdown-menu-radio-indicator-icon' size={8} />
    </span>
    {children}
  </div>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// Group Component
const DropdownMenuGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

// Portal Component (no-op for compatibility)
const DropdownMenuPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

// Sub Components (simplified)
const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

interface DropdownMenuSubTriggerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSubTriggerProps
>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-sub-trigger ${
      inset ? 'dropdown-menu-sub-trigger-inset' : ''
    } ${className || ''}`}
    {...props}
  >
    {children}
    <FiChevronRight className='dropdown-menu-sub-trigger-chevron' size={16} />
  </div>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`dropdown-menu-sub-content ${className || ''}`}
    {...props}
  />
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// RadioGroup Component
const DropdownMenuRadioGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

// Shortcut Component
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={`dropdown-menu-shortcut ${className || ''}`} {...props} />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
