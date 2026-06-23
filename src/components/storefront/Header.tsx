import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import HeaderCart from "./HeaderCart";
import CategoryNav from "./CategoryNav";
import { SearchIcon, UserIcon, ChevronDown, PinIcon } from "./icons";

// Server component — fetches the category list once and renders the full
// masthead: utility bar, main bar (logo + search + account + cart) and the
// sticky category nav beneath it.
export default async function Header() {
  const categories = await listActiveCategories();

  return (
    <>
      {/* utility bar */}
      <div className="util">
        <div className="wrap">
          <div className="util-left">
            <span className="util-dot" />
            <span className="hide-sm">
              Free delivery on orders over ৳2,000 · <b>Cash on Delivery</b> available nationwide
            </span>
          </div>
          <div className="util-right">
            <Link href="/track">
              <PinIcon size={14} /> Track Order
            </Link>
            <Link href="/pages/support-center" className="hide-sm">Help Center</Link>
            <Link href="/pages/contact-us" className="hide-sm">Become a Seller</Link>
          </div>
        </div>
      </div>

      {/* main bar */}
      <header className="hdr">
        <div className="wrap">
          <Link href="/" className="logo">
            <span className="mark"><span>FZ</span></span>
            <span><b>FZ</b><i>Mart</i></span>
          </Link>

          <form className="search" action="/products" method="get" role="search">
            <span className="cat-sel">All Categories <ChevronDown size={12} /></span>
            <input name="q" type="text" placeholder="Search for products, brands and more…" />
            <button type="submit"><SearchIcon size={17} /> Search</button>
          </form>

          <div className="hdr-actions">
            <Link href="/track" className="icon-btn">
              <UserIcon size={22} />
              <span className="ib-txt"><small>Account</small><b>Sign in</b></span>
            </Link>
            <HeaderCart />
          </div>
        </div>
      </header>

      <CategoryNav categories={categories} />
    </>
  );
}
