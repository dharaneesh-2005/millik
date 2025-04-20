import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Truck } from "lucide-react";

interface TrackingIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trackingId: string) => Promise<void>;
  orderNumber: string;
}

export function TrackingIdModal({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
}: TrackingIdModalProps) {
  const [trackingId, setTrackingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!trackingId.trim()) {
      setError("Please enter a tracking ID");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm(trackingId);
      setTrackingId("");
      onClose();
    } catch (err) {
      setError("Failed to update order. Please try again.");
      console.error("Error updating order with tracking ID:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Truck className="mr-2 h-5 w-5 text-green-600" />
            Add Tracking Information
          </DialogTitle>
          <DialogDescription>
            Enter the tracking ID for order #{orderNumber}. An email with this tracking information 
            will be sent to the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trackingId">Tracking ID</Label>
            <Input
              id="trackingId"
              placeholder="Enter courier tracking ID"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              disabled={isSubmitting}
              className="w-full"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Update & Send Email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}