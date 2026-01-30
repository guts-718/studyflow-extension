export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        "w-full px-3 py-2 rounded-md bg-white border border-gray-300 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
        "text-sm"
            +
        className
      }
    />
  );
}
