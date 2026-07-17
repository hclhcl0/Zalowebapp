import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORIES = [
  {
    name: 'Bảng giá và Tình trạng Vắc xin',
    order: 1,
    imageUrl: '/images/categories/vaccine_status.png',
    description: 'Trung tâm Kiểm soát bệnh tật (CDC) Thành phố Đà Nẵng tự hào là đơn vị y tế dự phòng tuyến đầu, cung cấp đầy đủ các loại vắc xin thế hệ mới nhất cho cả trẻ em và người lớn. Chúng tôi cam kết 100% vắc xin được bảo quản nghiêm ngặt theo chuẩn GSP quốc tế với hệ thống dây chuyền lạnh hiện đại, đảm bảo hiệu quả miễn dịch tối đa. Cùng đội ngũ y bác sĩ tận tâm, khám sàng lọc kỹ lưỡng, CDC Đà Nẵng mang đến trải nghiệm tiêm chủng an toàn, nhẹ nhàng và an tâm tuyệt đối cho mọi gia đình.',
  },
  {
    name: 'Gói vắc xin',
    order: 2,
    imageUrl: '/images/categories/vaccine_package.png',
    description: 'Bảo vệ sức khỏe trọn đời với các Gói Vắc Xin thiết kế chuyên biệt tại CDC Đà Nẵng! Hiểu được tầm quan trọng của việc tiêm chủng đúng lịch, chúng tôi cung cấp đa dạng các gói tiêm linh hoạt: cho trẻ sơ sinh, trẻ nhỏ, phụ nữ chuẩn bị mang thai và người trưởng thành. Lựa chọn gói vắc xin không chỉ giúp bạn tiết kiệm chi phí, không lo khan hiếm thuốc mà còn được hệ thống tự động nhắc lịch tiêm thông minh, đảm bảo không bỏ lỡ bất kỳ mũi tiêm quan trọng nào cho người thân yêu.',
  },
  {
    name: 'Bảng giá dịch vụ Xét nghiệm, Khám chữa bệnh',
    order: 3,
    imageUrl: '/images/categories/testing_clinic.png',
    description: 'Khoa Xét nghiệm và Khám bệnh tại CDC Đà Nẵng là địa chỉ vàng đáng tin cậy trong việc chẩn đoán và chăm sóc sức khỏe. Sở hữu hệ thống trang thiết bị tự động hóa hoàn toàn, đạt chuẩn chất lượng quốc tế ISO 15189:2012, chúng tôi cung cấp hàng loạt xét nghiệm từ cơ bản đến chuyên sâu (sinh hóa, huyết học, miễn dịch, sinh học phân tử). Đội ngũ chuyên gia, kỹ thuật viên giàu kinh nghiệm cam kết mang đến kết quả chính xác tuyệt đối, nhanh chóng, làm cơ sở vững chắc cho quá trình điều trị hiệu quả.',
  },
  {
    name: 'Bảng giá khám, tư vấn sức khoẻ',
    order: 4,
    imageUrl: '/images/categories/health_consulting.png',
    description: 'Chủ động bảo vệ bản thân với dịch vụ Khám và Tư vấn Sức khỏe toàn diện tại CDC Đà Nẵng. Không chỉ dừng lại ở việc chữa bệnh, chúng tôi chú trọng vào "phòng bệnh hơn chữa bệnh". Các chuyên gia y tế hàng đầu sẽ trực tiếp thăm khám tổng quát, tư vấn dinh dưỡng chuyên sâu, chăm sóc sức khỏe sinh sản và thiết kế phác đồ phòng bệnh cá nhân hóa. Với không gian y tế thân thiện, thủ tục nhanh gọn, chúng tôi đồng hành cùng bạn xây dựng một cuộc sống khỏe mạnh, năng động.',
  },
  {
    name: 'Bảng giá quầy thuốc',
    order: 5,
    imageUrl: '/images/categories/pharmacy.png',
    description: 'Quầy thuốc an toàn - Tiện lợi - Chuẩn y khoa tại CDC Đà Nẵng. Nhằm đáp ứng nhu cầu điều trị và chăm sóc sức khỏe sau thăm khám, quầy thuốc cung cấp đầy đủ các danh mục thuốc thiết yếu, vắc xin đường uống và sinh phẩm y tế chính hãng, được kiểm định khắt khe bởi Bộ Y tế. Đặc biệt, đội ngũ Dược sĩ đại học luôn sẵn sàng tư vấn miễn phí, hướng dẫn sử dụng thuốc an toàn, đúng liều lượng, giúp tối ưu hóa hiệu quả điều trị cho từng khách hàng.',
  },
  {
    name: 'Bảng giá khám, tư vấn, điều trị phơi nhiễm HIV',
    order: 6,
    imageUrl: '/images/categories/hiv_treatment.png',
    description: 'Đồng hành cùng cộng đồng, CDC Đà Nẵng cung cấp dịch vụ khám, tư vấn và điều trị dự phòng phơi nhiễm HIV (PrEP/PEP) chuyên nghiệp, an toàn và hoàn toàn bảo mật. Chúng tôi hiểu những lo âu của bạn, vì vậy mọi quy trình đều được thiết kế khép kín, tôn trọng tối đa quyền riêng tư trong một không gian thấu hiểu và không kỳ thị. Với phác đồ điều trị cập nhật mới nhất từ Bộ Y tế, chúng tôi tự tin mang lại giải pháp bảo vệ sức khỏe kịp thời và hiệu quả nhất.',
  },
  {
    name: 'Bảng giá thu phí hoạt động Kiểm dịch Y tế quốc tế',
    order: 7,
    imageUrl: '/images/categories/international_quarantine.png',
    description: 'Đóng vai trò là "lá chắn thép" bảo vệ sức khỏe cộng đồng tại các cửa ngõ giao thương, CDC Đà Nẵng cung cấp dịch vụ Kiểm dịch Y tế Quốc tế chuyên nghiệp tại các cảng biển và cảng hàng không. Các dịch vụ bao gồm: khám chứng nhận sức khỏe xuất nhập cảnh, giám sát y tế phương tiện vận tải, hàng hóa chuẩn quốc tế theo Điều lệ IHR 2005. Quy trình thủ tục được số hóa nhanh chóng, minh bạch, tạo điều kiện thuận lợi tối đa cho doanh nghiệp và hành khách.',
  },
  {
    name: 'Bảng giá dịch vụ quan trắc môi trường lao động',
    order: 8,
    imageUrl: '/images/categories/work_environment.png',
    description: 'Kiến tạo môi trường làm việc an toàn, nâng tầm giá trị doanh nghiệp cùng dịch vụ Quan trắc môi trường lao động của CDC Đà Nẵng. Với hệ thống máy đo đạc hiện đại và các kỹ sư môi trường am hiểu sâu sắc, chúng tôi giúp doanh nghiệp đánh giá chính xác các yếu tố rủi ro (vi khí hậu, tiếng ồn, bụi, khí độc...). Báo cáo quan trắc chi tiết, đạt chuẩn pháp lý không chỉ giúp doanh nghiệp tuân thủ luật định mà còn là giải pháp bảo vệ nguồn nhân lực - tài sản quý giá nhất của mọi tổ chức.',
  },
  {
    name: 'Bảng giá khám bệnh nghề nghiệp',
    order: 9,
    imageUrl: '/images/categories/occupational_disease.png',
    description: 'Bảo vệ sức khỏe người lao động với dịch vụ Khám Bệnh Nghề Nghiệp chuyên sâu tại CDC Đà Nẵng. Chúng tôi tự hào là đơn vị đủ điều kiện pháp lý và năng lực chuyên môn để tổ chức khám phát hiện sớm, chẩn đoán chính xác các bệnh lý liên quan đến điều kiện làm việc đặc thù (bụi phổi, điếc nghề nghiệp, nhiễm độc hóa chất...). Góp phần cùng doanh nghiệp chăm lo sức khỏe toàn diện cho người lao động, nâng cao năng suất và xây dựng môi trường lao động phát triển bền vững.',
  },
  {
    name: 'Bảng giá dịch vụ xét nghiệm mẫu nước',
    order: 10,
    imageUrl: '/images/categories/water_testing.png',
    description: 'Đảm bảo nguồn sống sạch với dịch vụ Xét nghiệm Mẫu Nước uy tín từ CDC Đà Nẵng. Nước sạch là khởi nguồn của sức khỏe. Phòng Lab đạt chuẩn quốc gia của chúng tôi chuyên tiếp nhận phân tích đa dạng các loại mẫu: nước sinh hoạt, nước tinh khiết, nước giếng, nước thải công nghiệp. Kết quả kiểm nghiệm chi tiết, có giá trị pháp lý cao, giúp các hộ gia đình an tâm sử dụng và hỗ trợ các cơ sở sản xuất kinh doanh khẳng định chất lượng, tuân thủ nghiêm ngặt quy chuẩn môi trường.',
  },
];

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      // Cập nhật description dù đã tồn tại
      await prisma.serviceCategory.update({
        where: { id: existing.id },
        data: { description: cat.description, order: cat.order, imageUrl: cat.imageUrl },
      });
      results.push({ name: cat.name, status: 'updated' });
      skipped++;
    } else {
      await prisma.serviceCategory.create({
        data: { name: cat.name, order: cat.order, description: cat.description, imageUrl: cat.imageUrl, isActive: true },
      });
      results.push({ name: cat.name, status: 'created' });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Tạo mới: ${created}, Bỏ qua (đã tồn tại): ${skipped}`,
    created,
    skipped,
    results,
  });
}
