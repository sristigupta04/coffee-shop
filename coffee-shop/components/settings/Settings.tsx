
type Setting ={
    title:string;
    description:string;
    checked:boolean;
    onChange:()=>void;
}

export default function Setting({
    title, description,checked,onChange,
}:Setting){
        return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">{title}</h2>

        <p className="mt-1 text-sm text-[#7b6252]">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={`h-7 w-12 rounded-full ${
          checked ? "bg-[#6f472f]" : "bg-gray-300"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition ${
            checked ? "ml-6" : "ml-1"
          }`}
        />
      </button>
    </div>
  );
}
    

