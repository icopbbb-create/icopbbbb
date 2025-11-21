// app/profile/page.tsx
import styles from "./profile.module.css";

export default function ProfilePage() {
  return (
    <main className="profile-isolated">       {/* <-- important: isolation root */}
      <div className={styles.profileRoot}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={styles.avatarWrap}>
            <img src="/images/avatar.png" alt="Profile" className={styles.avatarImg} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>icop xop</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Member since 2024</div>
          </div>
        </div>

        <div className={styles.menu}>
          <a className={styles.menuItem} href="/my-journey">My Journey</a>
          <a className={styles.menuItem} href="/settings">Settings</a>
          <button className={styles.menuItem}>Sign out</button>
        </div>
      </div>
    </main>
  );
}
