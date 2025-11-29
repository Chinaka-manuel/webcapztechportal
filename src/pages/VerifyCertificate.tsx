import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Search, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [certificateNumber, setCertificateNumber] = useState(searchParams.get('cert') || '');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const certParam = searchParams.get('cert');
    if (certParam) {
      setCertificateNumber(certParam);
      verifyCertificate(certParam);
    }
  }, [searchParams]);

  const verifyCertificate = async (certNumber?: string) => {
    const numberToVerify = certNumber || certificateNumber;
    
    if (!numberToVerify.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a certificate number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          student:students(student_id, profiles(full_name, email)),
          courses(course_name, course_code),
          issued_by_profile:profiles!certificates_issued_by_fkey(full_name)
        `)
        .eq('certificate_number', numberToVerify.trim())
        .single();

      if (error || !data) {
        setVerificationResult({ valid: false });
      } else {
        setVerificationResult({ valid: true, ...data });
      }
    } catch (error: any) {
      setVerificationResult({ valid: false });
      toast({
        title: 'Error',
        description: 'Failed to verify certificate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Award className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Certificate Verification</h1>
          <p className="text-muted-foreground">Verify the authenticity of certificates</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enter Certificate Number</CardTitle>
            <CardDescription>
              Enter the certificate number to verify its authenticity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="cert-number" className="sr-only">Certificate Number</Label>
                <Input
                  id="cert-number"
                  placeholder="e.g., CERT-2024-1234"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyCertificate()}
                />
              </div>
              <Button onClick={() => verifyCertificate()} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {verificationResult && (
          <Card className={verificationResult.valid ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="pt-6">
              {verificationResult.valid ? (
                <div>
                  <div className="flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
                    Valid Certificate
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Certificate Number</p>
                        <p className="font-semibold">{verificationResult.certificate_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Issue Date</p>
                        <p className="font-semibold">
                          {new Date(verificationResult.issue_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Student Name</p>
                        <p className="font-semibold">{verificationResult.student.profiles.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Student ID</p>
                        <p className="font-semibold">{verificationResult.student.student_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Course</p>
                        <p className="font-semibold">{verificationResult.courses.course_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Course Code</p>
                        <p className="font-semibold">{verificationResult.courses.course_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Grade</p>
                        <p className="font-semibold">{verificationResult.grade || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Issued By</p>
                        <p className="font-semibold">{verificationResult.issued_by_profile.full_name}</p>
                      </div>
                    </div>
                    {verificationResult.barcode_data && (
                      <div className="text-center mt-6">
                        <img 
                          src={verificationResult.barcode_data} 
                          alt="Certificate QR Code" 
                          className="mx-auto h-32 w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-center mb-6">
                    <XCircle className="h-16 w-16 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-4 text-red-600">
                    Invalid Certificate
                  </h2>
                  <p className="text-center text-muted-foreground">
                    This certificate number could not be verified. Please check the number and try again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;