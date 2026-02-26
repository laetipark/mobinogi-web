import React from "react";
import {Link} from "react-router-dom";
import styles from "./site-footer.module.scss";

const SiteFooter:React.FC = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className={styles.footer}>
			<div className={`container ${styles.footerInner}`}>
				<div className={styles.brand}>
					<strong>Sexynogi</strong>
					<span>마비노기 모바일 정보 허브</span>
				</div>

				<nav className={styles.footerNav} aria-label="푸터 바로가기">
					<Link to="/news">소식</Link>
					<Link to="/events">이벤트</Link>
					<Link to="/items">아이템</Link>
					<Link to="/board">게시판</Link>
					<Link to="/gallery">갤러리</Link>
				</nav>

				<small className={styles.copy}>© {currentYear} Sexynogi</small>
			</div>
		</footer>
	);
};

export default SiteFooter;
