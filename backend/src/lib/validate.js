export function validate(schema, data) {
  const res = schema.safeParse(data);
  if (!res.success) {
    const issues = res.error.issues?.map(i => ({ path: i.path?.join(".") || "", message: i.message })) || [];
    const err = new Error("VALIDATION_ERROR");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    err.details = issues;
    throw err;
  }
  return res.data;
}
