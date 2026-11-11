import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <span className={styles.logoText}>FinStep</span>
          <span className={styles.appBadge}>MINI APP</span>
        </div>
        <span className={styles.link}>Кредит онлайн</span>
      </div>
    </header>
  );
}
