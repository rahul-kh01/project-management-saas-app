import clsx from 'clsx';

const Input = ({ 
  label, 
  error, 
  className, 
  register,
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'input',
          error && 'border-danger-500 focus:ring-danger-500',
          className
        )}
        {...(register || {})}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
    </div>
  );
};

export default Input;

