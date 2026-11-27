resource "aws_acm_certificate" "certificate" {
  domain_name       = var.domain_name
  validation_method = var.validation_method

  tags = {
    Name = var.acm_certificate_name
  }
}

data "aws_route53_zone" "zone" {
  name         = var.zone_name
  private_zone = false
}

resource "aws_route53_record" "validation" {
  name            = one(aws_acm_certificate.certificate.domain_validation_options).resource_record_name
  records         = [one(aws_acm_certificate.certificate).resource_record_value]
  type            = one(aws_acm_certificate.certificate.domain_validation_options).resource_record_type
  allow_overwrite = true
  ttl             = 60
  zone_id         = data.aws_route53_zone.certificate.zone_id
}

resource "aws_acm_certificate_validation" "example" {
  certificate_arn         = aws_acm_certificate.example.arn
  validation_record_fqdns = [for record in aws_route53_record.example : record.fqdn]
}

resource "aws_lb_listener" "example" {
  # ... other configuration ...

  certificate_arn = aws_acm_certificate_validation.example.certificate_arn
}

