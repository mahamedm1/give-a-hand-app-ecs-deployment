output "execution_role_arn" {
  description = "Execution role's ARN to know which IAM role to use"
  value       = aws_iam_role.main.arn
}