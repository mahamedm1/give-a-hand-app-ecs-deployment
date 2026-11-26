resource "aws_acm_certificate" "cert" {
  domain_name       = var.alb_dns_name
  validation_method = "DNS"

  tags = {
    Name = var.aws_acm_certificate_name
  }

  lifecycle {
    create_before_destroy = true
  }
}
