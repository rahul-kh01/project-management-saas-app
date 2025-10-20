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
        <label className="block text-sm font-medium text-primary-700 mb-1">
          {label}
        </label>
      )}

      <input
        className={clsx(
          // Base vibrant styles
          'mt-1 block w-full rounded-md border border-primary-300 bg-primary-50 text-primary-900 placeholder-primary-400',
          'focus:border-primary-500 focus:ring-primary-500 transition duration-200',
          // Error state override
          error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',
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
