output "acm_certificate_arn" {
  description = "ARN for my ACM certificate"
  value = aws_acm_certificate.cert.arn
}

