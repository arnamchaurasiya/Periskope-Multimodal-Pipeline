/**
 * Subsystem 3: Deterministic Algorithmic Validators & Checksum Engine
 * Eliminates LLM alphanumeric hallucinations by enforcing strict deterministic
 * validation on Indian vehicle plates, E-Way bills, and GSTINs (Mod 36 checksum).
 */

import type { ExtractedEntities } from '../types/index.ts';

export interface ValidationResult {
  isValid: boolean;
  normalized: string;
  reason?: string;
}

export class EntityValidator {
  /**
   * Indian Vehicle Registration Plate Validator
   * Format: 2-letter state + 1-2 digit RTO district + 1-3 letter series + 4-digit unique number
   * e.g. MH-12-RN-8841, DL01AB1234, KA 04 D 9999
   */
  public static validateIndianVehiclePlate(rawPlate: string): ValidationResult {
    const cleaned = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const plateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
    const isValid = plateRegex.test(cleaned);

    if (!isValid) {
      return {
        isValid: false,
        normalized: rawPlate,
        reason: `Does not match Indian vehicle registration pattern (e.g., MH-12-RN-8841)`,
      };
    }

    // Format into canonical dashed format: MH-12-RN-8841
    const match = cleaned.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
    const normalized = match ? `${match[1]}-${match[2]}-${match[3]}-${match[4]}` : cleaned;

    return { isValid: true, normalized };
  }

  /**
   * Indian E-Way Bill Number Validator
   * Strict 12-digit numeric constraint established by the National Informatics Centre (NIC)
   */
  public static validateEWayBill(rawEWay: string): ValidationResult {
    const cleaned = rawEWay.replace(/[^0-9]/g, '');
    const isValid = cleaned.length === 12;

    return {
      isValid,
      normalized: cleaned,
      reason: isValid ? undefined : `E-Way bill must be exactly 12 numeric digits (found ${cleaned.length})`,
    };
  }

  /**
   * Indian Goods and Services Tax Identification Number (GSTIN) Validator
   * 15-character alphanumeric format with ISO/IEC 7064 Mod 36, 36 check digit:
   * 2 digits (State Code) + 10 chars (PAN) + 1 entity num + 'Z' + 1 Check Digit
   */
  public static validateGSTIN(rawGstin: string): ValidationResult {
    const cleaned = rawGstin.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length !== 15) {
      return {
        isValid: false,
        normalized: cleaned,
        reason: `GSTIN must be exactly 15 characters (found ${cleaned.length})`,
      };
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(cleaned)) {
      return {
        isValid: false,
        normalized: cleaned,
        reason: 'Invalid GSTIN structure: 14th character must be Z and characters 3-12 must be valid PAN',
      };
    }

    // Mod 36, 36 Checksum verification
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let factor = 1;
    let sum = 0;
    const checkChar = cleaned[14];

    for (let i = 0; i < 14; i++) {
      const charIndex = chars.indexOf(cleaned[i]);
      if (charIndex === -1) {
        return { isValid: false, normalized: cleaned, reason: 'Invalid character in GSTIN string' };
      }

      let product = charIndex * factor;
      factor = factor === 1 ? 2 : 1;
      let quotient = Math.floor(product / 36);
      let remainder = product % 36;
      sum += quotient + remainder;
    }

    const remainder = sum % 36;
    const checkIndex = (36 - remainder) % 36;
    const expectedCheckChar = chars[checkIndex];

    const isValid = expectedCheckChar === checkChar;
    return {
      isValid,
      normalized: cleaned,
      reason: isValid ? undefined : `GSTIN checksum mismatch: expected check digit ${expectedCheckChar}, found ${checkChar}`,
    };
  }

  /**
   * Cleanses and deterministically tags all extracted entities in the payload
   */
  public static validateAndCleanEntities(entities: ExtractedEntities): ExtractedEntities {
    const flags: Record<string, { isValid: boolean; warning?: string }> = {};

    // Validate Vehicle Plates
    if (entities.vehiclePlateNumbers && entities.vehiclePlateNumbers.length > 0) {
      entities.vehiclePlateNumbers = entities.vehiclePlateNumbers.map((plate) => {
        const { isValid, normalized, reason } = EntityValidator.validateIndianVehiclePlate(plate);
        if (!isValid) {
          flags[`plate_${plate}`] = { isValid: false, warning: reason };
        }
        return normalized;
      });
    }

    // Validate E-Way Bills
    if (entities.eWayBillNumbers && entities.eWayBillNumbers.length > 0) {
      entities.eWayBillNumbers = entities.eWayBillNumbers.map((eway) => {
        const { isValid, normalized, reason } = EntityValidator.validateEWayBill(eway);
        if (!isValid) {
          flags[`eway_${eway}`] = { isValid: false, warning: reason };
        }
        return normalized;
      });
    }

    // Validate GSTINs
    const gstinKeys = Object.keys(entities).filter((k) => k.toLowerCase().includes('gstin'));
    for (const key of gstinKeys) {
      const gstinVal = (entities as any)[key];
      if (typeof gstinVal === 'string') {
        const { isValid, normalized, reason } = EntityValidator.validateGSTIN(gstinVal);
        (entities as any)[key] = normalized;
        if (!isValid) {
          flags[`gstin_${key}`] = { isValid: false, warning: reason };
        }
      }
    }

    entities.validationFlags = flags;
    return entities;
  }
}
