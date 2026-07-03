export default function DateSeparator({ date }: { date: string }) {
  return (
    <div className="tg-date">
      <div className="tg-date-pill">{date}</div>
    </div>
  );
}
