import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

import { FormField } from '../components/form/FormField';
import { useNotification } from '../hooks/useNotification';
import { registerPatient } from '../services/patients';
import { nowDateTimeInput, toApiDateTime } from '../utils/date';

const patientFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First Name cannot be blank')
    .regex(/^[A-Za-z\s]+$/, 'Only Alphabets are allowed in the Name'),
  lastName: z
    .string()
    .min(1, 'Last Name cannot be blank')
    .regex(/^[A-Za-z\s]+$/, 'Only Alphabets are allowed in the Name'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().min(1, 'Address cannot be blank'),
  dateofbirth: z.string().min(1, 'Date of Birth is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile should have 10 digits'),
  email: z.union([z.literal(''), z.string().email('Invalid email')]),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const handleNameInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value.replace(/[^A-Za-z\s]/g, '');
    event.currentTarget.value = nextValue;
  };
  const handleMobileInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
    event.currentTarget.value = nextValue;
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'male',
      address: '',
      dateofbirth: '2000-01-01T00:00',
      mobile: '',
      email: '',
    },
  });

  const submit = (payment: number) =>
    handleSubmit(async (values) => {
      const response = await registerPatient({
        patient: {
          ...values,
          email: values.email || undefined,
          dateofbirth: toApiDateTime(values.dateofbirth),
        },
        payment,
      });

      if (response.success) {
        notify('Patient registered successfully', 'success');
        navigate('/search');
        return;
      }

      notify(response.message ?? 'Something went wrong', 'error');
    });

  return (
    <>
      <section className="section-header">
        <div>
          <h2 className="section-title">Register a new Patient</h2>
          {/* <p className="muted">Validation is now schema-based, explicit, and consistent.</p> */}
        </div>
      </section>

      <section className="card pad-1">
        <form className="grid grid--2">
          <FormField
            label="First Name"
            onInput={handleNameInput}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <FormField
            label="Last Name"
            onInput={handleNameInput}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <label className="field">
            <span className="field__label">Gender</span>
            <select className="field__control" {...register('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender?.message ? (
              <span className="field__error">{errors.gender.message}</span>
            ) : null}
          </label>
          <FormField
            label="Date of Birth"
            type="datetime-local"
            max={nowDateTimeInput()}
            error={errors.dateofbirth?.message}
            {...register('dateofbirth')}
          />
          <FormField label="Address" error={errors.address?.message} {...register('address')} />
          <FormField
            label="Mobile"
            inputMode="numeric"
            maxLength={10}
            pattern="[0-9]{10}"
            onInput={handleMobileInput}
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          <FormField label="Email (Optional)" error={errors.email?.message} {...register('email')} />
        </form>
        <div className="actions mt-1">
          <button
            className="button button--primary"
            onClick={() => void submit(0)()}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? 'Registering...' : 'Register User'}
          </button>
          <button
            className="button button--secondary"
            onClick={() => void submit(150)()}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? 'Registering...' : 'Register and OPD'}
          </button>
        </div>
      </section>
    </>
  );
}
