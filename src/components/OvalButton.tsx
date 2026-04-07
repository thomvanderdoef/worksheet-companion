import type { FC, ReactNode } from 'react';

interface OvalButtonProps {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'disabled';
  onClick?: () => void;
  disabled?: boolean;
}

export const OvalButton: FC<OvalButtonProps> = ({
  label,
  icon,
  variant = 'primary',
  onClick,
  disabled = false,
}) => {
  const surface = {
    primary:
      'bg-primary text-white border-transparent',
    secondary:
      'bg-white text-primary border-cool-gray',
    disabled:
      'bg-gray-btn text-white border-transparent',
  }[disabled ? 'disabled' : variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center"
    >
      <div className="flex flex-col h-[68px] items-center justify-center">
        <div className="bg-gray-btn flex flex-col h-[60px] items-center justify-end rounded-[30px]">
          <div className="flex flex-col h-[60px] items-center justify-center rounded-[30px]">
            <div
              className={`flex flex-1 items-center justify-center gap-[9px] min-h-0 min-w-0 px-9 rounded-[30px] border-[2.25px] border-solid font-bold text-[32px] leading-[50px] transition-transform active:scale-95 ${surface}`}
            >
              {icon && (
                <span className="shrink-0 w-9 h-9 flex items-center justify-center">
                  {icon}
                </span>
              )}
              <span className="whitespace-nowrap">{label}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
