'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, Mail, Phone, MapPin, Building, Briefcase } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface UserDetailData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  department?: string;
  position?: string;
  isEmployee?: boolean;
}

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  user: UserDetailData | null;
}

export function UserDetailModal({
  open,
  onOpenChange,
  title,
  user,
}: UserDetailModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Nama</span>
            <span className="text-sm font-medium">{user.name}</span>
          </div>

          {(user.email || user.phone) && (
            <div className="grid grid-cols-2 gap-4">
              {user.email && (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <span className="text-sm">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    No. Telepon
                  </span>
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
            </div>
          )}

          {user.address && (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Alamat
              </span>
              <span className="text-sm whitespace-pre-wrap">{user.address}</span>
            </div>
          )}

          {user.isEmployee && (user.department || user.position) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {user.department && (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Building className="h-3.5 w-3.5" />
                      Departemen
                    </span>
                    <span className="text-sm">{user.department}</span>
                  </div>
                )}
                {user.position && (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      Posisi
                    </span>
                    <span className="text-sm">{user.position}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
