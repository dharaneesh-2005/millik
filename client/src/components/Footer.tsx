import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";
import logoPath from "@assets/LOGO-removebg-preview.png";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-green-800 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex justify-center mb-6">
              <img
                src={logoPath}
                alt="Millikit Logo"
                className="h-24 md:h-32 w-auto mr-2 bg-white p-2 rounded-full shadow-lg"
              />
            </div>
            <p className="text-gray-300 text-center">{t("footer.tagline")}</p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <i className="fas fa-envelope"></i>
                <span>skdhara2222@gmail.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fas fa-phone"></i>
                <span>+91 7548871552</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fas fa-map-marker-alt"></i>
                <span>
                  3/179A, Malaipalayam Thonguttipalayam, Tiruppur Tamil Nadu,
                  India 641665
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">
              {t("footer.followUs")}
            </h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-2xl hover:text-yellow-400 transition-colors"
                aria-label="Facebook"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="#"
                className="text-2xl hover:text-yellow-400 transition-colors"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="#"
                className="text-2xl hover:text-yellow-400 transition-colors"
                aria-label="Twitter"
              >
                <i className="fab fa-twitter"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-green-700 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            &copy; {new Date().getFullYear()} Millikit.{" "}
            {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
