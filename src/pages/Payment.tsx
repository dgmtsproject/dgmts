import React, { useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { Payment as PaymentIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../config';

interface PaymentResponse {
  status: string;
  message?: string;
  error?: string;
  transactionId?: string;
  authCode?: string;
  responseCode?: string;
  accountNumber?: string;
  accountType?: string;
}

const Payment: React.FC = () => {
  // Form state
  const [amount, setAmount] = useState<string>('100.00');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [cardCode, setCardCode] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zip, setZip] = useState<string>('');
  const [country, setCountry] = useState<string>('USA');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) < 100 || parseFloat(amount) > 300) {
      setError('Amount must be between $100 and $300');
      return false;
    }
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number');
      return false;
    }
    if (!expirationDate || !/^\d{2}\/\d{2}$/.test(expirationDate)) {
      setError('Please enter expiration date in MM/YY format');
      return false;
    }
    if (!cardCode || cardCode.length < 3) {
      setError('Please enter a valid CVV');
      return false;
    }
    if (!firstName || !lastName) {
      setError('Please enter your first and last name');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTransactionId(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expirationDate,
          cardCode,
          firstName,
          lastName,
          address,
          city,
          state,
          zip,
          country
        })
      });

      const data: PaymentResponse = await response.json();

      if (!response.ok) {
        setError(data.error || 'Payment processing failed');
        setLoading(false);
        return;
      }

      if (data.status === 'success') {
        setSuccess(data.message || 'Payment processed successfully!');
        setTransactionId(data.transactionId || null);
        // Reset form
        setCardNumber('');
        setExpirationDate('');
        setCardCode('');
      } else {
        setError(data.error || 'Payment processing failed');
      }
    } catch (err) {
      setError(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiration = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <PaymentIcon /> Payment Processing
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Sandbox Mode:</strong> Use test card numbers from Authorize.net testing guide.
            <br />
            Test Visa: 4111111111111111 | Test Mastercard: 5424000000000015
            <br />
            Use any future expiration date (MM/YY) and any 3-digit CVV.
          </Typography>
        </Alert>

        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          boxSizing: 'border-box',
          maxWidth: '100%'
        }}>
          <Box sx={{ 
            flex: { xs: '1 1 auto', md: '0 0 55%' },
            minWidth: 0,
            maxWidth: { xs: '100%', md: '55%' }
          }}>
            <Card sx={{ width: '100%', boxSizing: 'border-box' }}>
              <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                <Typography variant="h6" gutterBottom>
                  Payment Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <form onSubmit={handleSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', boxSizing: 'border-box' }}>
                    <TextField
                      label="Amount ($)"
                      type="text"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val === '' || (parseFloat(val) >= 100 && parseFloat(val) <= 300)) {
                          setAmount(val);
                        }
                      }}
                      required
                      helperText="Amount must be between $100 and $300"
                      fullWidth
                    />

                    <TextField
                      label="Card Number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      required
                      inputProps={{ maxLength: 19 }}
                      fullWidth
                    />

                    <Box sx={{ display: 'flex', gap: 2, width: '100%', boxSizing: 'border-box' }}>
                      <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
                        <TextField
                          label="Expiration (MM/YY)"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(formatExpiration(e.target.value))}
                          placeholder="MM/YY"
                          required
                          inputProps={{ maxLength: 5 }}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
                        <TextField
                          label="CVV"
                          value={cardCode}
                          onChange={(e) => setCardCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                          type="password"
                          required
                          inputProps={{ maxLength: 4 }}
                          fullWidth
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                      Billing Information
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, width: '100%', boxSizing: 'border-box' }}>
                      <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
                        <TextField
                          label="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          fullWidth
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
                        <TextField
                          label="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          fullWidth
                        />
                      </Box>
                    </Box>

                    <TextField
                      label="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      fullWidth
                    />

                    <Box sx={{ display: 'flex', gap: 2, width: '100%', boxSizing: 'border-box' }}>
                      <Box sx={{ flex: '1 1 50%', minWidth: 0 }}>
                        <TextField
                          label="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 25%', minWidth: 0 }}>
                        <TextField
                          label="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 25%', minWidth: 0 }}>
                        <TextField
                          label="ZIP Code"
                          value={zip}
                          onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, '').substring(0, 10))}
                          fullWidth
                        />
                      </Box>
                    </Box>

                    <TextField
                      label="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      fullWidth
                    />

                    {error && (
                      <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                      </Alert>
                    )}

                    {success && (
                      <Alert severity="success">
                        {success}
                        {transactionId && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Transaction ID: {transactionId}
                          </Typography>
                        )}
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      fullWidth
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      {loading ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          Processing...
                        </>
                      ) : (
                        `Pay $${amount}`
                      )}
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ 
            flex: { xs: '1 1 auto', md: '0 0 40%' },
            minWidth: 0,
            maxWidth: { xs: '100%', md: '40%' }
          }}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Amount:</Typography>
                <Typography fontWeight="bold">${amount || '0.00'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Processing Fee:</Typography>
                <Typography>$0.00</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">${amount || '0.00'}</Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default Payment;
