import type { FC, ReactNode } from 'react';

interface OvalButtonProps {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'disabled';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const OvalButton: FC<OvalButtonProps> = ({
  label,
  icon,
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
}) => {
  const isInteractive = !disabled && Boolean(onClick);
  const palette = {
    primary: {
      shell: 'bg-gray-btn',
      face: 'bg-student-primary text-white border-transparent hover:bg-student-primary-dark-1',
    },
    secondary: {
      shell: 'bg-gray-btn',
      face: 'bg-white text-student-primary border-student-cool-gray-light-1 hover:bg-student-primary-light-3',
    },
    disabled: {
      shell: 'bg-gray-btn',
      face: 'bg-white text-student-cool-gray-dark-1 border-student-cool-gray-light-1',
    },
  }[disabled ? 'disabled' : variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={isInteractive ? 0 : -1}
      className={[
        'k1-focus-ring group inline-flex align-middle',
        isInteractive ? 'cursor-pointer' : disabled ? 'cursor-not-allowed' : 'cursor-default',
      ].join(' ')}
    >
      <span
        className={[
          'relative grid h-[68px] w-fit max-w-full rounded-full',
          className,
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={`col-start-1 row-start-1 mt-[8px] h-[60px] rounded-full ${palette.shell}`}
        />
        <span
          className={[
            'col-start-1 row-start-1 inline-flex h-[60px] items-center justify-center gap-[9px] rounded-full border-[2.25px] px-9 text-[32px] font-bold leading-[50px] whitespace-nowrap transition-all duration-100 justify-self-stretch',
            palette.face,
            isInteractive ? 'group-hover:-translate-y-px group-active:translate-y-[8px]' : '',
          ].join(' ')}
        >
          {icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              {icon}
            </span>
          ) : null}
          <span>{label}</span>
        </span>
      </span>
    </button>
  );
};
