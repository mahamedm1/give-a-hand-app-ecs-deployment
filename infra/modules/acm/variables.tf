variable "alb_dns_name" {
    type = string
    description = "Name for the ALB DNS name"
}

variable "aws_acm_certificate_name" {
    type = string
    description = "Name for the ACM certification"
}

variable "var.validation_method" {
    type = string
    description = "Method to validate ACM certificate"
}

