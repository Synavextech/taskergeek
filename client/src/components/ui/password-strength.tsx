import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import zxcvbn from 'zxcvbn';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const result = zxcvbn(password);
  const score = result.score; // 0-4
  const feedback = result.feedback;

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return 'Very Weak';
    }
  };

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
        return 'text-destructive';
      case 1:
        return 'text-destructive/80';
      case 2:
        return 'text-warning';
      case 3:
        return 'text-primary';
      case 4:
        return 'text-success';
      default:
        return 'text-destructive';
    }
  };

  const getProgressColor = (score: number) => {
    switch (score) {
      case 0:
        return 'bg-destructive';
      case 1:
        return 'bg-destructive/80';
      case 2:
        return 'bg-warning';
      case 3:
        return 'bg-primary';
      case 4:
        return 'bg-success';
      default:
        return 'bg-destructive';
    }
  };

  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password Strength:</span>
        <span className={cn('text-sm font-medium', getStrengthColor(score))}>
          {getStrengthText(score)}
        </span>
      </div>
      
      <div className="relative">
        <Progress 
          value={(score + 1) * 20} 
          className="h-2"
        />
        <div 
          className={cn(
            'absolute top-0 left-0 h-2 rounded-full transition-all duration-300',
            getProgressColor(score)
          )}
          style={{ width: `${(score + 1) * 20}%` }}
        />
      </div>

      {/* Feedback */}
      {feedback.warning && (
        <p className="text-xs text-destructive">{feedback.warning}</p>
      )}
      
      {feedback.suggestions.length > 0 && (
        <div className="space-y-1">
          {feedback.suggestions.map((suggestion: string, index: number) => (
            <p key={index} className="text-xs text-muted-foreground">
              💡 {suggestion}
            </p>
          ))}
        </div>
      )}

      {/* Requirements checklist */}
      <div className="space-y-1 text-xs">
        <div className={cn(
          'flex items-center gap-2 transition-colors duration-200',
          password.length >= 8 ? 'text-success' : 'text-muted-foreground'
        )}>
          <span className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            password.length >= 8 ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {password.length >= 8 ? '✓' : '✗'}
          </span>
          <span>At least 8 characters</span>
        </div>
        <div className={cn(
          'flex items-center gap-2 transition-colors duration-200',
          /[A-Z]/.test(password) ? 'text-success' : 'text-muted-foreground'
        )}>
          <span className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            /[A-Z]/.test(password) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {/[A-Z]/.test(password) ? '✓' : '✗'}
          </span>
          <span>One uppercase letter (A-Z)</span>
        </div>
        <div className={cn(
          'flex items-center gap-2 transition-colors duration-200',
          /[a-z]/.test(password) ? 'text-success' : 'text-muted-foreground'
        )}>
          <span className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            /[a-z]/.test(password) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {/[a-z]/.test(password) ? '✓' : '✗'}
          </span>
          <span>One lowercase letter (a-z)</span>
        </div>
        <div className={cn(
          'flex items-center gap-2 transition-colors duration-200',
          /[0-9]/.test(password) ? 'text-success' : 'text-muted-foreground'
        )}>
          <span className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            /[0-9]/.test(password) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {/[0-9]/.test(password) ? '✓' : '✗'}
          </span>
          <span>One number (0-9)</span>
        </div>
        <div className={cn(
          'flex items-center gap-2 transition-colors duration-200',
          /[^A-Za-z0-9]/.test(password) ? 'text-success' : 'text-muted-foreground'
        )}>
          <span className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            /[^A-Za-z0-9]/.test(password) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {/[^A-Za-z0-9]/.test(password) ? '✓' : '✗'}
          </span>
          <span>One special character (!@#$%^&*)</span>
        </div>
      </div>
    </div>
  );
}