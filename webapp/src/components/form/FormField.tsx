import {
  forwardRef,
  type Ref,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
}

type FieldProps =
  | (BaseFieldProps &
      InputHTMLAttributes<HTMLInputElement> & {
        as?: 'input';
      })
  | (BaseFieldProps &
      TextareaHTMLAttributes<HTMLTextAreaElement> & {
        as: 'textarea';
      });

export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FieldProps
>(function FormField(props, ref) {
  const { label, error, as = 'input', ...rest } = props;

  return (
    <label className="field field--floating">
      {as === 'textarea' ? (
        <textarea
          ref={ref as Ref<HTMLTextAreaElement>}
          className="field__control field__control--textarea"
          placeholder=" "
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as Ref<HTMLInputElement>}
          className="field__control"
          placeholder=" "
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      <span className="field__label">{label}</span>
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
});
