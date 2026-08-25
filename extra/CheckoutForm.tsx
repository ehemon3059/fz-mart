'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';

// ১. প্রোডাক্টের ডিফল্ট সাবটোটাল
const DEFAULT_SUBTOTAL = 1200;

// ২. ঢাকা সাব-আরবান জেলাগুলো (৳১০০ চার্জ)
const dhakaSuburbs = ["গাজীপুর", "নারায়ণগঞ্জ", "মানিকগঞ্জ", "মুন্সীগঞ্জ"];

// ৩. ঢাকার ভেতরের বিশেষ থানা যেগুলোকে কুরিয়ার কোম্পানি সাব-আরবান ধরে (৳১০০ চার্জ)
const dhakaSuburbUpazilas = ["সাভার", "ধামরাই", "কেরানীগঞ্জ", "নবাবগঞ্জ", "দোহার"];

// ৪. বিভাগ অনুযায়ী জেলা ডাটা
const districtData: Record<string, string[]> = {
  dhaka: ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "টাঙ্গাইল", "কিশোরগঞ্জ", "মানিকগঞ্জ", "মুন্সীগঞ্জ", "নরসিংদী", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর"],
  chattogram: ["চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা", "ফেণী", "ব্রাহ্মণবাড়িয়া", "নোয়াখালী", "লক্ষ্মীপুর", "চাঁদপুর", "খাগড়াছড়ি", "রাঙ্গামাটি", "বান্দরবান"],
  rajshahi: ["রাজশাহী", "বগুড়া", "পাবনা", "সিরাজগঞ্জ", "নওগাঁ", "নাটোর", "জয়পুরহাট", "চাঁপাইনবাবগঞ্জ"],
  khulna: ["খুলনা", "যশোর", "সাতক্ষীরা", "বাগেরহাট", "ঝিনাইদহ", "কুষ্টিয়া", "মাগুরা", "মেহেরপুর", "নড়াইল", "চুয়াডাঙ্গা"],
  barishal: ["বরিশাল", "পটুয়াখালী", "ভোলা", "পিরোজপুর", "বরগুনা", "ঝালকাঠি"],
  sylhet: ["সিলেট", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"],
  rangpur: ["রংপুর", "দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "পঞ্চগড়", "ঠাকুরগাঁও"],
  mymensingh: ["ময়মনসিংহ", "জামালপুর", "শেরপুর", "নেত্রকোণা"]
};

// ৫. জেলা অনুযায়ী উপজেলা / থানা ডাটা
const upazilaData: Record<string, string[]> = {
  "ঢাকা": ["ধানমন্ডি", "গুলশান", "মিরপুর", "উত্তরা", "মোহাম্মদপুর", "শাহবাগ", "সাভার", "ধামরাই", "কেরানীগঞ্জ", "নবাবগঞ্জ", "দোহার"],
  "গাজীপুর": ["গাজীপুর সদর", "কালিয়াকৈর", "শ্রীপুর", "কাপাসিয়া", "কালীগঞ্জ"],
  "নারায়ণগঞ্জ": ["নারায়ণগঞ্জ সদর", "রূপগঞ্জ", "সোনারগাঁও", "আড়াইহাজার", "বন্দর"],
  "টাঙ্গাইল": ["টাঙ্গাইল সদর", "মির্জাপুর", "ঘাটাইল", "কালিহাতী", "সখীপুর", "মধুপুর", "বাসাইল"],
  "কিশোরগঞ্জ": ["কিশোরগঞ্জ সদর", "ভৈরব", "বাজিতপুর", "হোসেনপুর", "পাকুন্দিয়া"],
  "মানিকগঞ্জ": ["মানিকগঞ্জ সদর", "সিংগাইর", "সাটুরিয়া", "ঘিওর", "শিবালয়"],
  "মুন্সীগঞ্জ": ["মুন্সীগঞ্জ সদর", "সিরাজদিখান", "শ্রীনগর", "লৌহজং", "টঙ্গীবাড়ী"],
  "চট্টগ্রাম": ["কোতোয়ালী", "পাহাড়তলী", "পাঁচলাইশ", "হাটহাজারী", "পটিয়া", "সীতাকুণ্ড"],
  "কুমিল্লা": ["কুমিল্লা সদর", "লাকসাম", "দাউদকান্দি", "দেবিদ্বার"],
  "সিলেট": ["সিলেট সদর", "দক্ষিণ সুরমা", "গোলাপগঞ্জ", "বীণাবাজার"],
  "রাজশাহী": ["বোয়ালিয়া", "রাজপাড়া", "মতিহার", "পবা", "গোদাগাড়ী"],
  "খুলনা": ["খুলনা সদর", "সোনাডাঙ্গা", "খালিশপুর", "দৌলতপুর", "রূপসা"],
  "বরিশাল": ["বরিশাল সদর", "বাকেরগঞ্জ", "বাবুগঞ্জ", "উজিরপুর"],
  "রংপুর": ["রংপুর সদর", "মিঠাপুকুর", "পীরগঞ্জ", "কাউনিয়া"],
  "ময়মনসিংহ": ["ময়মনসিংহ সদর", "মুক্তাগাছা", "ফুলবাড়িয়া", "ত্রিশাল", "ভালুকা"],
  "জামালপুর": ["জামালপুর সদর", "সরিষাবাড়ী", "মেলান্দহ", "ইসলামপুর"]
};

export interface CheckoutFormData {
  fullName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  address: string;
  subtotal: number;
  shippingCharge: number;
  totalAmount: number;
  zoneName: string;
}

interface CheckoutFormProps {
  subtotal?: number;
  onSubmitOrder?: (data: CheckoutFormData) => void;
}

export default function CheckoutForm({ subtotal = DEFAULT_SUBTOTAL, onSubmitOrder }: CheckoutFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');

  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [zoneName, setZoneName] = useState<string>('');

  // কুরিয়ার চার্জ হিসাব করার লজিক
  const calculateShipping = (district: string, upazila: string) => {
    if (!district) {
      setShippingCharge(0);
      setZoneName('');
      return;
    }

    if (district === "ঢাকা") {
      if (upazila && dhakaSuburbUpazilas.includes(upazila)) {
        setShippingCharge(100);
        setZoneName("ঢাকা সাব-আরবান (সাভার/কেরানীগঞ্জ)");
      } else {
        setShippingCharge(70);
        setZoneName("ইনসাইড ঢাকা সিটি");
      }
    } else if (dhakaSuburbs.includes(district)) {
      setShippingCharge(100);
      setZoneName("ঢাকা সাব-আরবান জোন");
    } else {
      setShippingCharge(130);
      setZoneName("আউটসাইড ঢাকা (অল বাংলাদেশ)");
    }
  };

  // বিভাগ পরিবর্তন
  const handleDivisionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const division = e.target.value;
    setSelectedDivision(division);
    setSelectedDistrict('');
    setSelectedUpazila('');
    calculateShipping('', '');
  };

  // জেলা পরিবর্তন
  const handleDistrictChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    setSelectedUpazila('');
    calculateShipping(district, '');
  };

  // উপজেলা/থানা পরিবর্তন
  const handleUpazilaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const upazila = e.target.value;
    setSelectedUpazila(upazila);
    calculateShipping(selectedDistrict, upazila);
  };

  // ফর্ম সাবমিট
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const formData: CheckoutFormData = {
      fullName,
      phone,
      division: selectedDivision,
      district: selectedDistrict,
      upazila: selectedUpazila,
      address,
      subtotal,
      shippingCharge,
      totalAmount: subtotal + shippingCharge,
      zoneName
    };

    if (onSubmitOrder) {
      onSubmitOrder(formData);
    } else {
      console.log('Order Submitted:', formData);
    }
  };

  const availableDistricts = selectedDivision ? districtData[selectedDivision] || [] : [];
  const availableUpazilas = selectedDistrict ? upazilaData[selectedDistrict] || [] : [];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 md:p-8 bg-gray-900 text-white">
        <h1 className="text-2xl font-bold">ই-কমার্স চেকআউট</h1>
        <p className="text-gray-400 text-sm mt-1">আপনার ডেলিভারি তথ্য দিন এবং অর্ডার সম্পন্ন করুন</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Shipping Form (Left) */}
        <div className="lg:col-span-7 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">ডেলিভারি ঠিকানা</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">আপনার নাম *</label>
            <input 
              type="text" 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="উদা: আবরার ফাহাদ" 
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">মোবাইল নম্বর *</label>
            <input 
              type="tel" 
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX" 
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Division Dropdown */}
          <div>
            <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">বিভাগ *</label>
            <select 
              id="division" 
              required
              value={selectedDivision} 
              onChange={handleDivisionChange}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
            >
              <option value="" disabled>বিভাগ নির্বাচন করুন</option>
              <option value="dhaka">ঢাকা</option>
              <option value="chattogram">চট্টগ্রাম</option>
              <option value="rajshahi">রাজশাহী</option>
              <option value="khulna">খুলনা</option>
              <option value="barishal">বরিশাল</option>
              <option value="sylhet">সিলেট</option>
              <option value="rangpur">রংপুর</option>
              <option value="mymensingh">ময়মনসিংহ</option>
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">জেলা *</label>
            <select 
              id="district" 
              required
              value={selectedDistrict} 
              onChange={handleDistrictChange}
              disabled={!selectedDivision}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                {selectedDivision ? 'জেলা নির্বাচন করুন' : 'প্রথমে বিভাগ নির্বাচন করুন'}
              </option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Upazila / Thana Dropdown */}
          <div>
            <label htmlFor="upazila" className="block text-sm font-medium text-gray-700 mb-1">উপজেলা / থানা *</label>
            <select 
              id="upazila" 
              required
              value={selectedUpazila} 
              onChange={handleUpazilaChange}
              disabled={!selectedDistrict}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                {selectedDistrict ? 'উপজেলা / থানা নির্বাচন করুন' : 'প্রথমে জেলা নির্বাচন করুন'}
              </option>
              {availableUpazilas.map((upz) => (
                <option key={upz} value={upz}>{upz}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">পূর্ণাঙ্গ ঠিকানা *</label>
            <textarea 
              rows={2} 
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="বাড়ি/হোল্ডিং নম্বর, রোড, এলাকা..." 
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            ></textarea>
          </div>
        </div>

        {/* Order Summary (Right) */}
        <div className="lg:col-span-5 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">অর্ডার সামারি</h2>

            {/* Cart Item Sample */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-500 text-xs">IMG</div>
              <div className="flex-1">
                <h3 class="text-sm font-medium text-gray-800">প্রিমিয়াম টি-শার্ট</h3>
                <p className="text-xs text-gray-500">পরিমাণ: ১</p>
              </div>
              <span className="text-sm font-semibold text-gray-800">৳{subtotal}</span>
            </div>

            {/* Price Calculation Breakdown */}
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>সাবটোটাল</span>
                <span>৳{subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ডেলিভারি চার্জ</span>
                <span className="font-medium text-blue-600">
                  {selectedDistrict ? `৳${shippingCharge}` : 'জেলা/উপজেলা নির্বাচন করুন'}
                </span>
              </div>
              {zoneName && (
                <div>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">
                    {zoneName}
                  </span>
                </div>
              )}
            </div>

            <hr className="my-4 border-gray-300" />

            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>সর্বমোট</span>
              <span className="text-xl text-blue-600">৳{subtotal + shippingCharge}</span>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-md transition duration-200 mt-6"
          >
            অর্ডার নিশ্চিত করুন
          </button>
        </div>

      </form>
    </div>
  );
}