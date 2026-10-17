import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';
type E164Number = string;

interface PhoneInputProps {
  value?: E164Number;
  onChange?: (value: E164Number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function InternationalPhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  className,
  disabled = false,
  error = false,
}: PhoneInputProps) {
  return (
    <div className={cn('relative', className)}>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="US" // Default to US
        value={value}
        onChange={onChange || (() => {})}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'phone-input',
          error && 'phone-input-error'
        )}
        numberInputProps={{
          className: cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
            error && 'border-destructive focus-visible:ring-destructive'
          ),
        }}
        countrySelectProps={{
          className: cn(
            'flex h-10 items-center justify-center rounded-l-md border border-r-0 border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted/50 transition-colors duration-200',
            error && 'border-destructive focus-visible:ring-destructive'
          ),
        }}
      />
      
      <style>{`
        .phone-input {
          display: flex;
          align-items: center;
        }
        
        .phone-input .PhoneInputCountry {
          margin-right: 0;
          border-right: 0;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .phone-input .PhoneInputInput {
          border-left: 0;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          flex: 1;
        }
        
        .phone-input-error .PhoneInputCountry,
        .phone-input-error .PhoneInputInput {
          border-color: hsl(var(--destructive));
        }
        
        .phone-input .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          font-size: inherit;
          color: inherit;
        }
        
        .phone-input .PhoneInputCountrySelect:focus {
          outline: none;
        }
        
        .phone-input .PhoneInputCountrySelectArrow {
          margin-left: 4px;
          opacity: 0.6;
        }
        
        .phone-input .PhoneInputCountryIcon {
          width: 20px;
          height: 15px;
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
}
export function isValidE164(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}
export function formatToE164(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
}