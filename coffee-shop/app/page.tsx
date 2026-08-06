import Link from "next/link";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1>Hello World</h1>

      <Link href="/orders">
        <Button name="Order" title1="Coffee" />
      </Link>
    </div>
  );
}