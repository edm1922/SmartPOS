import React from 'react';
import { useFormContext, Controller, FormProvider, UseFormReturn } from 'react-hook-form';

interface FormProps {
  children: React.ReactNode;
  onSubmit: (data: any) => void;
  className?: string;
  form?: UseFormReturn<any>; // Add form prop
  spacing?: 'compact' | 'normal' | 'loose';
}

interface FormFieldProps {
  name: string;
  label?: string;
  children: (field: any, fieldState: any) => React.ReactNode;
  className?: string;
  description?: string;
}

interface FormInputProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  description?: string;
  icon?: React.ReactNode;
}

const Form: React.FC<FormProps> = ({ children, onSubmit, className = '', form, spacing = 'normal', ...props }) => {
  const spacingClass = {
    compact: 'space-y-3',
    normal: 'space-y-4',
    loose: 'space-y-6',
  }[spacing];
  
  // If form is provided, use FormProvider to make it available to child components
  if (form) {
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={`${className} ${spacingClass}`} {...props}>
          {children}
        </form>
      </FormProvider>
    );
  }
  
  // Otherwise, use useFormContext
  const { handleSubmit } = useFormContext();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`${className} ${spacingClass}`} {...props}>
      {children}
    </form>
  );
};

const FormField: React.FC<FormFieldProps> = ({ name, label, children, className = '', description }) => {
  const { control } = useFormContext();
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={className}>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 mb-2">{description}</p>
          )}
          {children(field, fieldState)}
          {fieldState.error && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
};

const FormInput: React.FC<FormInputProps> = ({ 
  name, 
  label, 
  type = 'text', 
  placeholder, 
  className = '',
  description,
  icon
}) => {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      )}
      <div className="relative rounded-md shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          {...register(name)}
          className={`appearance-none block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
            error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors duration-200`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message as string}
        </p>
      )}
    </div>
  );
};

export { Form, FormField, FormInput };