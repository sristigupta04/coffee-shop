
type rops = {
  text:string;
  onClick:()=>void;
}

export default function Btn({text,onClick}:rops){
  return (
    <button onClick={onClick}
    className="rounded-lg bg-[#6f4e37] px-4 py-2 text-white hover:bg-[#5a3e2f] focus:outline-none focus:ring-2 focus:ring-[#6f4e37] focus:ring-offset-2">
      {text}
    </button>
  );
}