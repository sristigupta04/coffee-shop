type CategorySidebarProps = {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
};

export default function CategorySidebar({
  categories,
  selectedCategory,
  onCategorySelect,
}: CategorySidebarProps) {
  return (
    <div className="flex flex-col gap-2">
      {categories.map((category) => (
        <div
          key={category}
          onClick={() => onCategorySelect(category)}
          className={`cursor-pointer rounded-md px-4 py-2 ${
            selectedCategory === category
              ? "bg-[#6f4e37] text-white"
              : "bg-[#fffaf3] text-gray-700"
          }`}
        >
          {category}
        </div>
      ))}
    </div>
  );
}