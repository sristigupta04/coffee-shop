type Props = {
  text: string;
  onClick: () => void;
};

export default function Btn({ text, onClick }: Props) {
  return (
    <button onClick={onClick}>
      {text}
    </button>
  );
}