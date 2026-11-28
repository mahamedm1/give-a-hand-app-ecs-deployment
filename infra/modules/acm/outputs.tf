output "acm_certificate_arn" {
  description = "ARN for my ACM certificate"
  value       = aws_acm_certificate_validation.validation.certificate_arn
}

output "zone_id" {
  description = "ID for the Route53 public zone"
  value       = aws_route53_zone.dev.id
}

output "name_servers" {
  description = "Name server list"
  value       = aws_route53_zone.dev.name_servers
}

