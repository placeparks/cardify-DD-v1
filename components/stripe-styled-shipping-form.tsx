"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check } from "lucide-react"
import { allCountries } from "country-region-data"

// List of countries we ship to
const SHIPPING_COUNTRIES = [
  // North America
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'LU', name: 'Luxembourg' },
  
  // Asia-Pacific
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  
  // Middle East & Africa
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  
  // Americas (South & Central)
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'CO', name: 'Colombia' },
].sort((a, b) => a.name.localeCompare(b.name))

export interface ShippingAddress {
  email: string
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

interface StripeStyledShippingFormProps {
  onSubmit: (address: ShippingAddress) => void
  onBack: () => void
  isSubmitting?: boolean
  subtotal?: number
}

export function StripeStyledShippingForm({ onSubmit, onBack, isSubmitting = false, subtotal }: StripeStyledShippingFormProps) {
  const [formData, setFormData] = useState<ShippingAddress>({
    email: '',
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})
  const [keepUpdated, setKeepUpdated] = useState(false)

  // Get regions for the selected country
  const regions = useMemo(() => {
    if (!formData.country) return []
    
    if (Array.isArray(allCountries)) {
      const firstItem = allCountries[0]
      if (Array.isArray(firstItem)) {
        const countryData = allCountries.find((c: [string, string, Array<[string, string]>]) => c[1] === formData.country)
        if (countryData && countryData[2]) {
          return countryData[2].map((region: [string, string]) => ({
            name: region[0],
            shortCode: region[1]
          }))
        }
      } else {
        const countryData = allCountries.find((c: { countryName: string; countryShortCode: string; regions: Array<{ name: string; shortCode: string }> }) => c.countryShortCode === formData.country)
        return countryData?.regions || []
      }
    }
    
    return []
  }, [formData.country])

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      if (field === 'country' && value !== prev.country) {
        updated.state = ''
      }
      
      return updated
    })
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    }

    if (!formData.line1.trim()) {
      newErrors.line1 = 'Address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state.trim() && regions.length > 0) {
      newErrors.state = 'State/Province is required'
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal/ZIP code is required'
    }

    if (!formData.country) {
      newErrors.country = 'Country is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const getShippingPrice = () => {
    if (!formData.country) return null
    if (formData.country === 'US') return 4.99
    if (formData.country === 'CA') return 11.99
    return 16.99
  }

  const shippingPrice = getShippingPrice()
  const total = subtotal ? subtotal + (shippingPrice || 0) : shippingPrice

  return (
    <div className="p-6 stripe-styled-form-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Pridi:wght@300;400;500;600&display=swap');
        
        /* Override global cyberpunk scrollbar styles for Stripe-styled forms */
        .stripe-styled-form-wrapper ::-webkit-scrollbar,
        .stripe-styled-form-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-track,
        .stripe-styled-form-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-thumb,
        .stripe-styled-form-wrapper::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-thumb:hover,
        .stripe-styled-form-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        
        /* Firefox scrollbar override */
        .stripe-styled-form-wrapper,
        .stripe-styled-form-wrapper * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
        
        .stripe-checkout-form {
          font-family: 'Pridi', serif;
          color: #1a1f36;
          font-weight: 400;
        }
        
        .stripe-section-title {
          font-size: 20px;
          font-weight: 500;
          color: #1a1f36;
          margin-bottom: 20px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-label {
          display: block;
          font-size: 14px;
          font-weight: 400;
          color: #697386;
          margin-bottom: 6px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 16px;
          font-family: 'Pridi', serif;
          font-weight: 400;
          line-height: 1.5;
          border: 1px solid #e0e6ed;
          border-radius: 6px;
          background-color: white;
          color: #1a1f36;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none;
        }
        
        .stripe-input:focus {
          outline: none;
          border-color: #3bffff;
          box-shadow: 0 0 0 1px #3bffff;
        }
        
        .stripe-input::placeholder {
          color: #8898aa;
          opacity: 1;
        }
        
        .stripe-input.error {
          border-color: #ed5f74;
        }
        
        .stripe-input.error:focus {
          box-shadow: 0 0 0 1px #ed5f74;
        }
        
        .stripe-input:disabled {
          background-color: #f6f9fc;
          color: #8898aa;
          cursor: not-allowed;
        }
        
        .stripe-error {
          color: #ed5f74;
          font-size: 13px;
          margin-top: 4px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-select {
          width: 100%;
          padding: 10px 12px;
          padding-right: 32px;
          font-size: 16px;
          font-family: 'Pridi', serif;
          font-weight: 400;
          line-height: 1.5;
          border: 1px solid #e0e6ed;
          border-radius: 6px;
          background-color: white;
          color: #1a1f36;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b7c93' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 10px;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        
        .stripe-select:focus {
          outline: none;
          border-color: #3bffff;
          box-shadow: 0 0 0 1px #3bffff;
        }
        
        .stripe-select.error {
          border-color: #ed5f74;
        }
        
        .stripe-select.error:focus {
          box-shadow: 0 0 0 1px #ed5f74;
        }
        
        .stripe-select:disabled {
          background-color: #f6f9fc;
          color: #8898aa;
          cursor: not-allowed;
        }
        
        .stripe-checkbox-container {
          display: flex;
          align-items: flex-start;
          margin: 20px 0;
          cursor: pointer;
        }
        
        .stripe-checkbox {
          position: relative;
          width: 16px;
          height: 16px;
          margin-right: 12px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        .stripe-checkbox input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        
        .stripe-checkbox-visual {
          position: absolute;
          top: 0;
          left: 0;
          height: 16px;
          width: 16px;
          background-color: white;
          border: 1px solid #d1d9e0;
          border-radius: 3px;
          transition: all 0.15s ease;
        }
        
        .stripe-checkbox input:checked ~ .stripe-checkbox-visual {
          background-color: #3bffff;
          border-color: #3bffff;
        }
        
        .stripe-checkbox-visual:after {
          content: "";
          position: absolute;
          display: none;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        .stripe-checkbox input:checked ~ .stripe-checkbox-visual:after {
          display: block;
        }
        
        .stripe-checkbox-label {
          font-size: 14px;
          color: #697386;
          line-height: 1.4;
          font-family: 'Pridi', serif;
        }
        
        .stripe-checkbox-label a {
          color: #3bffff;
          text-decoration: underline;
        }
        
        .stripe-button {
          width: 100%;
          padding: 12px 20px;
          font-size: 16px;
          font-weight: 500;
          font-family: 'Pridi', serif;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .stripe-button-primary {
          background: #3bffff;
          color: #1a1f36;
        }
        
        .stripe-button-primary:hover:not(:disabled) {
          background: #2ee5e5;
          transform: translateY(-1px);
          box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
        }
        
        .stripe-button-secondary {
          background: white;
          color: #697386;
          border: 1px solid #e0e6ed;
        }
        
        .stripe-button-secondary:hover:not(:disabled) {
          color: #32325d;
          border-color: #c9d3e0;
          background: #f6f9fc;
        }
        
        .stripe-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .stripe-summary-box {
          background: #f6f9fc;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        
        .stripe-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-summary-row:last-child {
          margin-bottom: 0;
          padding-top: 8px;
          border-top: 1px solid #e0e6ed;
          font-weight: 500;
        }
        
        .stripe-summary-label {
          color: #697386;
          font-size: 14px;
        }
        
        .stripe-summary-value {
          color: #1a1f36;
          font-size: 14px;
          font-weight: 500;
        }
        
        .stripe-divider {
          height: 1px;
          background: #e0e6ed;
          margin: 24px 0;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="stripe-checkout-form">
        <div className="mb-6">
          <h2 className="stripe-section-title">Shipping information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="stripe-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`stripe-input ${errors.email ? 'error' : ''}`}
              placeholder="your@email.com"
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && (
              <p className="stripe-error">{errors.email}</p>
            )}
          </div>

          <label className="stripe-checkbox-container">
            <div className="stripe-checkbox">
              <input
                type="checkbox"
                checked={keepUpdated}
                onChange={(e) => setKeepUpdated(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="stripe-checkbox-visual"></span>
            </div>
            <span className="stripe-checkbox-label">
              Keep me updated with news and personalized offers
            </span>
          </label>

          <div className="stripe-divider"></div>

          <div>
            <h3 className="stripe-label" style={{ fontSize: '16px', marginBottom: '16px', color: '#1a1f36' }}>
              Shipping address
            </h3>
          </div>

          <div>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`stripe-input ${errors.name ? 'error' : ''}`}
              placeholder="Full name"
              disabled={isSubmitting}
              autoComplete="name"
            />
            {errors.name && (
              <p className="stripe-error">{errors.name}</p>
            )}
          </div>

          <div>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={`stripe-select ${errors.country ? 'error' : ''}`}
              disabled={isSubmitting}
              autoComplete="country"
            >
              <option value="">Select country</option>
              {SHIPPING_COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="stripe-error">{errors.country}</p>
            )}
          </div>

          <div>
            <input
              id="line1"
              type="text"
              value={formData.line1}
              onChange={(e) => handleInputChange('line1', e.target.value)}
              className={`stripe-input ${errors.line1 ? 'error' : ''}`}
              placeholder="Address"
              disabled={isSubmitting}
              autoComplete="address-line1"
            />
            {errors.line1 && (
              <p className="stripe-error">{errors.line1}</p>
            )}
          </div>

          <div>
            <input
              id="line2"
              type="text"
              value={formData.line2}
              onChange={(e) => handleInputChange('line2', e.target.value)}
              className="stripe-input"
              placeholder="Address line 2 (optional)"
              disabled={isSubmitting}
              autoComplete="address-line2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`stripe-input ${errors.city ? 'error' : ''}`}
                placeholder="City"
                disabled={isSubmitting}
                autoComplete="address-level2"
              />
              {errors.city && (
                <p className="stripe-error">{errors.city}</p>
              )}
            </div>

            <div>
              <input
                id="postal_code"
                type="text"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className={`stripe-input ${errors.postal_code ? 'error' : ''}`}
                placeholder="ZIP"
                disabled={isSubmitting}
                autoComplete="postal-code"
              />
              {errors.postal_code && (
                <p className="stripe-error">{errors.postal_code}</p>
              )}
            </div>
          </div>

          {regions.length > 0 && (
            <div>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={`stripe-select ${errors.state ? 'error' : ''}`}
                disabled={isSubmitting || !formData.country}
                autoComplete="address-level1"
              >
                <option value="">Select state</option>
                {regions.map(region => (
                  <option key={region.shortCode || region.name} value={region.shortCode || region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="stripe-error">{errors.state}</p>
              )}
            </div>
          )}
        </div>

        {subtotal && shippingPrice !== null && (
          <div className="stripe-summary-box">
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Subtotal</span>
              <span className="stripe-summary-value">${subtotal.toFixed(2)}</span>
            </div>
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Shipping</span>
              <span className="stripe-summary-value">${shippingPrice.toFixed(2)}</span>
            </div>
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Total</span>
              <span className="stripe-summary-value">${total?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="stripe-divider"></div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="stripe-button stripe-button-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="stripe-button stripe-button-primary"
          >
            {isSubmitting ? 'Processing...' : 'Continue to payment'}
          </button>
        </div>
      </form>
    </div>
  )
}