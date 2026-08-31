"use client";

/**
 * The two ways a product can start.
 *
 *   1. It already exists. Bought on a purchase order, sitting in the catalogue
 *      as a draft with its stock and cost attached — pick the supplier, pick
 *      the product, continue it on its edit page.
 *   2. It genuinely does not exist. Then, and only then, the blank form.
 *
 * The blank form is unchanged; it is simply no longer the FIRST thing on the
 * screen, because reaching for it first is what created duplicate records for
 * goods the shop had already bought. Everything about how it behaves once open
 * — validation, autosave, submit — is exactly as it was.
 */

import { useEffect, useRef, useState } from "react";
import ProductForm from "../ProductForm";
import type { GuideOption } from "../form/SizeGuidePanel";
import type { Category } from "../form/types";
import { draftKey, hasStoredDraft } from "../form/useDraftAutosave";
import SupplierSourcing, { type SupplierOption } from "./SupplierSourcing";

export default function NewProductStart({
  suppliers,
  categories,
  sizeGuides,
}: {
  suppliers: SupplierOption[];
  categories: Category[];
  sizeGuides: GuideOption[];
}) {
  const [blank, setBlank] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  /** Only a click scrolls; a rescued draft must not yank the page down. */
  const scrollNext = useRef(false);

  // A half-typed product from a previous visit lives in localStorage, and the
  // form has to be MOUNTED to offer it back. So if one is waiting, open the
  // form straight away — otherwise the rescue banner would sit behind a button
  // the admin has no reason to press.
  useEffect(() => {
    if (hasStoredDraft(draftKey(null))) setBlank(true);
  }, []);

  useEffect(() => {
    if (!blank || !scrollNext.current) return;
    scrollNext.current = false;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [blank]);

  return (
    <div className="space-y-6">
      <div className="px-5 lg:px-8">
        <SupplierSourcing
          suppliers={suppliers}
          createNewChosen={blank}
          onCreateNew={() => {
            scrollNext.current = true;
            setBlank(true);
          }}
        />
      </div>

      {blank && (
        <div ref={formRef} className="scroll-mt-6">
          <ProductForm categories={categories} sizeGuides={sizeGuides} />
        </div>
      )}
    </div>
  );
}
