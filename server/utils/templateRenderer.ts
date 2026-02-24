// server/utils/templateRenderer.ts
interface TemplateData {
  student_name?: string;
  student_first_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  confirmation_link?: string;
  tenant_name?: string;
  location?: string;
  price?: string;
  company_name?: string;
  // Add any other dynamic fields your templates might use
}

export function renderTemplate(templateBody: string, data: TemplateData): string {
  let renderedBody = templateBody;

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const placeholderWithoutBraces = new RegExp(`{${key}}`, 'g'); // For templates using single braces
      // @ts-ignore
      renderedBody = renderedBody.replace(placeholder, data[key] || '');
      // @ts-ignore
      renderedBody = renderedBody.replace(placeholderWithoutBraces, data[key] || '');
    }
  }
  return renderedBody;
}

export function renderSubject(templateSubject: string, data: TemplateData): string {
  // Subjects might also contain placeholders
  return renderTemplate(templateSubject, data);
}