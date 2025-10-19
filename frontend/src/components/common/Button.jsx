import clsx from "clsx";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  loading = false,
  fullWidth = false,
  ...props
}) => {
  // Base button classes (from index.css)
  const baseClasses =
    "btn inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  // ✅ Variants - mapped to new Tailwind palette
  const variants = {
    primary: "btn-primary", // bg-primary-500 hover:bg-primary-600 focus:ring-primary-300
    secondary: "btn-secondary", // bg-secondary-500 hover:bg-secondary-600 focus:ring-secondary-300
    danger: "btn-danger", // bg-danger-500 hover:bg-danger-600 focus:ring-danger-300
    outline: "btn-outline", // border-primary-500 hover:bg-primary-50
    ghost: "bg-transparent text-primary-600 hover:bg-primary-50", // ✨ New ghost variant
  };

  // ✅ Sizes - flexible padding and font size
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
