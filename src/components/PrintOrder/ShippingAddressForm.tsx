// src/components/PrintOrder/ShippingAddressForm.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "./PrintOrder.module.css";

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface ShippingAddressFormProps {
  initialAddress?: Partial<ShippingAddress>;
  onChange: (address: ShippingAddress, isValid: boolean) => void;
  disabled?: boolean;
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "Washington DC" },
];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  // Add more as needed
];

export function ShippingAddressForm({
  initialAddress,
  onChange,
  disabled = false,
}: ShippingAddressFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    name: initialAddress?.name || "",
    street1: initialAddress?.street1 || "",
    street2: initialAddress?.street2 || "",
    city: initialAddress?.city || "",
    state: initialAddress?.state || "",
    postalCode: initialAddress?.postalCode || "",
    country: initialAddress?.country || "US",
    phone: initialAddress?.phone || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  // Validate address
  const validateAddress = (addr: ShippingAddress): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {};

    if (!addr.name.trim()) newErrors.name = "Name is required";
    if (!addr.street1.trim()) newErrors.street1 = "Street address is required";
    if (!addr.city.trim()) newErrors.city = "City is required";
    if (!addr.state.trim()) newErrors.state = "State is required";
    if (!addr.postalCode.trim()) newErrors.postalCode = "ZIP code is required";
    if (addr.country === "US" && !/^\d{5}(-\d{4})?$/.test(addr.postalCode)) {
      newErrors.postalCode = "Invalid ZIP code format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Notify parent of changes
  useEffect(() => {
    const isValid = validateAddress(address);
    onChange(address, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.addressForm}>
      <h3 className={styles.sectionTitle}>Shipping Address</h3>

      <div className={styles.formGrid}>
        {/* Full Name */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label}>Full Name *</label>
          <input
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            value={address.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="John Smith"
            disabled={disabled}
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        {/* Street Address */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label}>Street Address *</label>
          <input
            type="text"
            className={`${styles.input} ${errors.street1 ? styles.inputError : ""}`}
            value={address.street1}
            onChange={(e) => handleChange("street1", e.target.value)}
            placeholder="123 Main Street"
            disabled={disabled}
          />
          {errors.street1 && <span className={styles.error}>{errors.street1}</span>}
        </div>

        {/* Apartment/Suite */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label}>Apartment, Suite, etc.</label>
          <input
            type="text"
            className={styles.input}
            value={address.street2}
            onChange={(e) => handleChange("street2", e.target.value)}
            placeholder="Apt 4B"
            disabled={disabled}
          />
        </div>

        {/* City */}
        <div className={styles.formGroup}>
          <label className={styles.label}>City *</label>
          <input
            type="text"
            className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
            value={address.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="New York"
            disabled={disabled}
          />
          {errors.city && <span className={styles.error}>{errors.city}</span>}
        </div>

        {/* State */}
        <div className={styles.formGroup}>
          <label className={styles.label}>State *</label>
          {address.country === "US" ? (
            <select
              className={`${styles.select} ${errors.state ? styles.inputError : ""}`}
              value={address.state}
              onChange={(e) => handleChange("state", e.target.value)}
              disabled={disabled}
            >
              <option value="">Select State</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className={`${styles.input} ${errors.state ? styles.inputError : ""}`}
              value={address.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="State/Province"
              disabled={disabled}
            />
          )}
          {errors.state && <span className={styles.error}>{errors.state}</span>}
        </div>

        {/* ZIP Code */}
        <div className={styles.formGroup}>
          <label className={styles.label}>ZIP / Postal Code *</label>
          <input
            type="text"
            className={`${styles.input} ${errors.postalCode ? styles.inputError : ""}`}
            value={address.postalCode}
            onChange={(e) => handleChange("postalCode", e.target.value)}
            placeholder="10001"
            disabled={disabled}
          />
          {errors.postalCode && <span className={styles.error}>{errors.postalCode}</span>}
        </div>

        {/* Country */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Country *</label>
          <select
            className={styles.select}
            value={address.country}
            onChange={(e) => handleChange("country", e.target.value)}
            disabled={disabled}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label}>Phone Number (for delivery updates)</label>
          <input
            type="tel"
            className={styles.input}
            value={address.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(555) 123-4567"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
