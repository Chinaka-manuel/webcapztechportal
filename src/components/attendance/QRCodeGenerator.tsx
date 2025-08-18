import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const QRCodeGenerator = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code Generator</CardTitle>
        <CardDescription>Generate QR codes for attendance tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          QR Code generation feature coming soon...
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;