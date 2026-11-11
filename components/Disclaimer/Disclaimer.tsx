import styles from "./Disclaimer.module.css";

export default function Disclaimer() {
  return (
    <p className={styles.alert}>
      Сервіс допомагає порівняти пропозиції фінансових партнерів. Остаточне
      рішення ухвалює кредитор.
    </p>
  );
}
